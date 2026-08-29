import { logger } from "../core/logger.js";
const JOBS = [
    { id:"miner", name:"Miner", payout:[30,60], cooldown: 3600*1000, description:"Mine minerals" },
    { id:"guard", name:"Guardian", payout:[40,80], cooldown: 3600*1000, description:"Guard the gates" },
    { id:"scribe", name:"Scribe", payout:[25,50], cooldown: 3600*1000, description:"Copy sacred texts" },
    { id:"healer", name:"Healer", payout:[35,70], cooldown: 3600*1000, description:"Heal the wounded" },
];
const DAILY_COOLDOWN=24*3600*1000, WEEKLY_COOLDOWN=7*24*3600*1000;
const dailyMap=new Map(), weeklyMap=new Map(), jobMap=new Map();
export class EconomyService {
    prisma; client;
    constructor(prisma, client){ this.prisma=prisma; this.client=client; }
    async getConfig(guildId){
        try{
            let cfg=await this.prisma.economyConfig.findUnique({ where:{ guildId }}).catch(()=>null);
            if(!cfg) cfg=await this.prisma.economyConfig.create({ data:{ guildId }}).catch(()=>({ guildId, dailyAmount:100, weeklyAmount:500, shopEnabled:true, tradingEnabled:true, jobsEnabled:true }));
            return cfg;
        }catch{ return { dailyAmount:100, weeklyAmount:500, shopEnabled:true, tradingEnabled:true, jobsEnabled:true }; }
    }
    async add(guildId, userId, amount, meta={ type:"adjust", actorId:null }){
        const row = await this.prisma.economy.findUnique({ where:{ guildId_userId:{ guildId, userId }}}).catch(()=>null);
        const bal = (row?.balance ?? 0) + amount;
        const next = Math.max(0, bal);
        const actual = next - (row?.balance ?? 0);
        await this.prisma.economy.upsert({ where:{ guildId_userId:{ guildId, userId }}, update:{ balance: next }, create:{ guildId, userId, balance: Math.max(0, amount) }});
        try{
            await this.prisma.economyTransaction.create({ data:{ guildId, userId, type: meta.type||"adjust", amount: actual, balanceAfter: next, meta: meta.meta? JSON.stringify(meta.meta): null }});
        }catch{}
        // Audit & achievements
        await this.client?.services?.audit?.log(guildId,{ actorId: meta.actorId||userId, targetId:userId, action:`economy_${meta.type}`, category:"economy", details:{ amount:actual, balance:next }}).catch(()=>{});
        if(next>=1000) await this.client?.services?.achievements?.checkAndUnlock(guildId, userId, { balance:next }).catch(()=>{});
        return next;
    }
    async get(guildId, userId){ const r=await this.prisma.economy.findUnique({ where:{ guildId_userId:{ guildId, userId }}}).catch(()=>null); return r?.balance ?? 0; }
    async set(guildId, userId, amount, actorId=null){
        const next = Math.max(0, amount|0);
        await this.prisma.economy.upsert({ where:{ guildId_userId:{ guildId, userId }}, update:{ balance: next }, create:{ guildId, userId, balance: next }});
        await this.prisma.economyTransaction.create({ data:{ guildId, userId, type:"admin_set", amount: next, balanceAfter: next, meta: JSON.stringify({ actorId })}}).catch(()=>{});
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
    async getHistory(guildId, userId, limit=10){
        return this.prisma.economyTransaction.findMany({ where:{ guildId, userId }, orderBy:{ createdAt:"desc" }, take: limit }).catch(()=>[]);
    }
    async handleMessage(message){
        if(message.author.bot || !message.guild) return;
        if(Math.random()>0.1) return;
        await this.add(message.guild.id, message.author.id, Math.floor(Math.random()*10)+5, { type:"message_reward" }).catch(()=>{});
    }
    // Daily / Weekly
    async claimDaily(guildId, userId){
        const now=Date.now(); const key=`${guildId}:${userId}`; const last=dailyMap.get(key)||0;
        if(now-last < DAILY_COOLDOWN) return { success:false, next: last+DAILY_COOLDOWN, remaining: (last+DAILY_COOLDOWN)-now };
        const cfg=await this.getConfig(guildId);
        dailyMap.set(key, now);
        const bal=await this.add(guildId, userId, cfg.dailyAmount, { type:"daily" });
        return { success:true, amount: cfg.dailyAmount, balance: bal };
    }
    async claimWeekly(guildId, userId){
        const now=Date.now(); const key=`${guildId}:${userId}`; const last=weeklyMap.get(key)||0;
        if(now-last < WEEKLY_COOLDOWN) return { success:false, next: last+WEEKLY_COOLDOWN };
        const cfg=await this.getConfig(guildId);
        weeklyMap.set(key, now);
        const bal=await this.add(guildId, userId, cfg.weeklyAmount, { type:"weekly" });
        return { success:true, amount: cfg.weeklyAmount, balance: bal };
    }
    // Jobs
    getJobs(){ return JOBS; }
    async work(guildId, userId, jobId){
        const job=JOBS.find(j=>j.id===jobId);
        if(!job) return { success:false, reason:"Unknown job" };
        const cfg=await this.getConfig(guildId);
        if(!cfg.jobsEnabled) return { success:false, reason:"Jobs disabled" };
        const key=`${guildId}:${userId}:${jobId}`; const last=jobMap.get(key)||0;
        if(Date.now()-last < job.cooldown) return { success:false, reason:`Cooldown`, next: last+job.cooldown };
        jobMap.set(key, Date.now());
        const payout=Math.floor(Math.random()*(job.payout[1]-job.payout[0]+1))+job.payout[0];
        const bal=await this.add(guildId, userId, payout, { type:"job", meta:{ jobId }});
        return { success:true, job, payout, balance: bal };
    }
    // Trading / Gifting
    async gift(guildId, fromId, toId, amount){
        if(fromId===toId) return { success:false, reason:"Cannot gift yourself" };
        if(!Number.isInteger(amount) || amount<1) return { success:false, reason:"Invalid amount" };
        const cfg=await this.getConfig(guildId);
        if(!cfg.tradingEnabled) return { success:false, reason:"Trading disabled" };
        const bal=await this.get(guildId, fromId);
        if(bal<amount) return { success:false, reason:`Insufficient funds ${bal}<${amount}` };
        await this.add(guildId, fromId, -amount, { type:"gift_out", meta:{ to:toId }});
        await this.add(guildId, toId, amount, { type:"gift_in", meta:{ from:fromId }});
        await this.client?.services?.audit?.log(guildId,{ actorId:fromId, targetId:toId, action:"gift", category:"economy", details:{ amount }}).catch(()=>{});
        return { success:true, amount };
    }
    async tradePropose(guildId, fromId, toId, offerAmount, requestItemName){
        // Simplified: for now, just gift + shop item check
        return this.gift(guildId, fromId, toId, offerAmount);
    }
    // Shop (preserve)
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
    async createShopItem(guildId, { name, description, price, roleId, emoji, stock, rarity }){ 
        if(!this.prisma.shopItem) throw new Error("ShopItem model not available — run prisma generate");
        const cleanName = String(name).trim().slice(0,32);
        if(!cleanName) throw new Error("Item name required");
        if(!Number.isInteger(price) || price < 1 || price > 100000) throw new Error("Price must be 1–100000");
        // rarity stored in description prefix if needed
        let desc = description?.slice(0,200) ?? null;
        if(rarity) desc = `[${rarity}] `+(desc||"");
        return await this.prisma.shopItem.create({ data:{ guildId, name: cleanName, description: desc, price, roleId: roleId ?? null, emoji: emoji?.slice(0,32) ?? null, stock: stock ?? null }});
    }
    async deleteShopItem(guildId, name){
        if(!this.prisma.shopItem) throw new Error("ShopItem model not available");
        return await this.prisma.shopItem.delete({ where:{ guildId_name:{ guildId, name } }}).catch(()=>null);
    }
    async buyItem(guildId, userId, itemName, member){
        const item = await this.getShopItem(guildId, itemName);
        if(!item) return { success:false, reason:"Item not found" };
        if(item.stock !== null && item.stock !== undefined && item.stock <= 0) return { success:false, reason:"Out of stock" };
        const cfg=await this.getConfig(guildId);
        if(!cfg.shopEnabled) return { success:false, reason:"Shop disabled" };
        const bal = await this.get(guildId, userId);
        if(bal < item.price) return { success:false, reason:`Not enough coins — need **${item.price}**, you have **${bal}**` };
        // Prevent race: use transaction style via update then check
        const newBal = await this.add(guildId, userId, -item.price, { type:"shop_buy", meta:{ item:item.name }});
        if(newBal<0){ await this.add(guildId, userId, item.price, { type:"refund" }); return { success:false, reason:"Race condition, try again" }; }
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
        if(item.stock !== null && item.stock !== undefined){
            await this.prisma.shopItem.update({ where:{ id:item.id }, data:{ stock:{ decrement:1 } }}).catch(()=>{});
        }
        let roleGranted=false; let roleError=null;
        if(item.roleId && member){
            try{
                if(member.guild?.roles?.cache?.has(item.roleId) && !member.roles.cache.has(item.roleId)){
                    await member.roles.add(item.roleId).catch(e=>{ roleError=e.message; });
                    roleGranted = !roleError && member.roles.cache.has(item.roleId);
                    if(!roleGranted && !roleError){
                        await member.roles.add(item.roleId);
                        roleGranted=true;
                    }
                } else if(member.roles.cache.has(item.roleId)){
                    roleGranted=true;
                }
            }catch(e){ roleError=e?.message ?? String(e); logger.error("economy","role grant failed",e); }
        }
        await this.client?.services?.audit?.log(guildId,{ actorId:userId, action:"shop_buy", category:"economy", details:{ item:item.name, price:item.price }}).catch(()=>{});
        return { success:true, item, newBalance:newBal, roleGranted, roleError };
    }
    // Admin
    async adminAdd(guildId, userId, amount, actorId){ return this.add(guildId, userId, amount, { type:"admin_add", actorId, meta:{ actorId }}); }
    async adminRemove(guildId, userId, amount, actorId){ return this.add(guildId, userId, -amount, { type:"admin_remove", actorId, meta:{ actorId }}); }
}
