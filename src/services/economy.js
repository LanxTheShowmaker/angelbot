import { EmbedBuilder } from "discord.js";
import { Theme } from "../design/theme.js";
import { logger } from "../core/logger.js";
export class EconomyService {
    prisma; client;
    constructor(prisma, client){ this.prisma=prisma; this.client=client; }
    async add(guildId, userId, amount){
        const row = await this.prisma.economy.findUnique({ where:{ guildId_userId:{ guildId, userId }}}).catch(()=>null);
        const bal = (row?.balance ?? 0) + amount;
        // Clamp to non-negative to prevent overflow abuse
        const next = Math.max(0, bal);
        await this.prisma.economy.upsert({ where:{ guildId_userId:{ guildId, userId }}, update:{ balance: next }, create:{ guildId, userId, balance: Math.max(0, amount) }});
        return next;
    }
    async get(guildId, userId){ const r=await this.prisma.economy.findUnique({ where:{ guildId_userId:{ guildId, userId }}}).catch(()=>null); return r?.balance ?? 0; }
    async set(guildId, userId, amount){
        const next = Math.max(0, amount|0);
        await this.prisma.economy.upsert({ where:{ guildId_userId:{ guildId, userId }}, update:{ balance: next }, create:{ guildId, userId, balance: next }});
        return next;
    }
    async getLeaderboard(guildId, limit=10, offset=0){
        limit = Math.min(Math.max(limit,1),25);
        offset = Math.max(offset,0);
        const [rows, total] = await Promise.all([
            this.prisma.economy.findMany({ where:{ guildId }, orderBy:{ balance:"desc" }, take: limit, skip: offset }).catch(()=>[]),
            this.prisma.economy.count({ where:{ guildId } }).catch(()=>0)
        ]);
        return { rows, total };
    }
    async handleMessage(message){
        if(message.author.bot || !message.guild) return;
        // 5-15 coins per minute, reuse leveling cooldown style via random chance 10%
        if(Math.random()>0.1) return;
        await this.add(message.guild.id, message.author.id, Math.floor(Math.random()*10)+5).catch(()=>{});
    }
    // ── Shop ──────────────────────────────────────────────────────────
    async getShopItems(guildId){
        try{
            if(!this.prisma.shopItem) return [];
            return await this.prisma.shopItem.findMany({ where:{ guildId }, orderBy:{ price:"asc" } });
        }catch(e){ logger.error("economy","getShopItems failed",e); return []; }
    }
    async getShopItem(guildId, name){
        try{
            if(!this.prisma.shopItem) return null;
            return await this.prisma.shopItem.findUnique({ where:{ guildId_name:{ guildId, name } } }).catch(()=>null);
        }catch(e){ return null; }
    }
    async createShopItem(guildId, { name, description, price, roleId, emoji, stock }){
        if(!this.prisma.shopItem) throw new Error("ShopItem model not available — run prisma generate");
        const cleanName = String(name).trim().slice(0,32);
        if(!cleanName) throw new Error("Item name required");
        if(!Number.isInteger(price) || price < 1 || price > 100000) throw new Error("Price must be 1–100000");
        return await this.prisma.shopItem.create({ data:{ guildId, name: cleanName, description: description?.slice(0,200) ?? null, price, roleId: roleId ?? null, emoji: emoji?.slice(0,32) ?? null, stock: stock ?? null }});
    }
    async deleteShopItem(guildId, name){
        if(!this.prisma.shopItem) throw new Error("ShopItem model not available");
        return await this.prisma.shopItem.delete({ where:{ guildId_name:{ guildId, name } }}).catch(()=>null);
    }
    async buyItem(guildId, userId, itemName, member){
        const item = await this.getShopItem(guildId, itemName);
        if(!item) return { success:false, reason:"Item not found" };
        if(item.stock !== null && item.stock !== undefined && item.stock <= 0) return { success:false, reason:"Out of stock" };
        const bal = await this.get(guildId, userId);
        if(bal < item.price) return { success:false, reason:`Not enough coins — need **${item.price}**, you have **${bal}**` };
        const newBal = await this.add(guildId, userId, -item.price);
        // Inventory tracking (optional — ignore if model missing)
        try{
            if(this.prisma.shopInventory){
                const existing = await this.prisma.shopInventory.findUnique({ where:{ guildId_userId_itemId:{ guildId, userId, itemId:item.id } }}).catch(()=>null);
                if(existing){
                    await this.prisma.shopInventory.update({ where:{ guildId_userId_itemId:{ guildId, userId, itemId:item.id }}, data:{ quantity:{ increment:1 } }}).catch(()=>{});
                } else {
                    await this.prisma.shopInventory.create({ data:{ guildId, userId, itemId:item.id, quantity:1 }}).catch(()=>{});
                }
            }
        }catch(e){ logger.error("economy","inventory update failed",e); }
        // Decrement stock if limited
        if(item.stock !== null && item.stock !== undefined){
            await this.prisma.shopItem.update({ where:{ id:item.id }, data:{ stock:{ decrement:1 } }}).catch(()=>{});
        }
        // Grant role if configured
        let roleGranted=false;
        let roleError=null;
        if(item.roleId && member){
            try{
                if(member.guild?.roles?.cache?.has(item.roleId) && !member.roles.cache.has(item.roleId)){
                    await member.roles.add(item.roleId).catch(e=>{ roleError=e.message; });
                    roleGranted = !roleError && member.roles.cache.has(item.roleId);
                    // If add failed but no exception (permissions), try again and check
                    if(!roleGranted && !roleError){
                        await member.roles.add(item.roleId);
                        roleGranted=true;
                    }
                } else if(member.roles.cache.has(item.roleId)){
                    roleGranted=true;
                }
            }catch(e){ roleError=e?.message ?? String(e); logger.error("economy","role grant failed",e); }
        }
        return { success:true, item, newBalance:newBal, roleGranted, roleError };
    }
}
