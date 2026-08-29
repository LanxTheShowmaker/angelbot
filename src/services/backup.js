import { logger } from "../core/logger.js";
export class BackupService {
    prisma; client;
    constructor(prisma, client){ this.prisma=prisma; this.client=client; }
    async create(guildId, actor){
        const guild = this.client.guilds.cache.get(guildId);
        try{
            const cfg = await this.client?.services?.settings.get(guildId).catch(()=>null);
            const panels = await this.prisma.panel.findMany({ where:{ guildId }}).catch(()=>[]);
            const ticketTypes = await this.prisma.ticketType.findMany({ where:{ guildId }}).catch(()=>[]);
            const reactionRoles = await this.prisma.reactionRole.findMany({ where:{ guildId }}).catch(()=>[]);
            const levelCfg = await this.prisma.levelConfig.findUnique({ where:{ guildId }}).catch(()=>null);
            const economyCfg = await this.prisma.economyConfig.findUnique({ where:{ guildId }}).catch(()=>null);
            const shopItems = await this.prisma.shopItem.findMany({ where:{ guildId }}).catch(()=>[]);
            const automod = cfg?.automod ?? {};
            const modules = cfg?.modules ?? {};
            const data = { guildId, snapshotAt: new Date().toISOString(), config:{ guildConfig: cfg, panels, ticketTypes, reactionRoles, levelCfg, economyCfg, shopItems, automod, modules }, version:2 };
            const backup = await this.prisma.backup.create({ data:{ guildId, data: JSON.stringify(data), createdById: actor.id, createdByTag: actor.tag }});
            await this.client?.services?.audit?.log(guildId,{ actorId:actor.id, action:"backup_create", category:"config", details:{ backupId: backup.id }}).catch(()=>{});
            return backup;
        }catch(e){ logger.error("backup","create failed",e); throw e; }
    }
    async list(guildId, limit=10){
        return this.prisma.backup.findMany({ where:{ guildId }, orderBy:{ createdAt:"desc" }, take:limit }).catch(()=>[]);
    }
    async get(guildId, id){
        return this.prisma.backup.findFirst({ where:{ guildId, id }}).catch(()=>null);
    }
    async restore(guildId, backupId, actor, { confirm=false }={}){
        if(!confirm) throw new Error("Confirmation required");
        const backup = await this.get(guildId, backupId);
        if(!backup) throw new Error("Backup not found");
        const parsed = JSON.parse(backup.data);
        const c = parsed.config;
        try{
            // Restore GuildConfig
            if(c.guildConfig){
                const gc=c.guildConfig;
                await this.prisma.guildConfig.upsert({ where:{ guildId }, update:{
                    logChannelId: gc.logChannelId, modLogChannelId: gc.modLogChannelId, welcomeChannelId: gc.welcomeChannelId, goodbyeChannelId: gc.goodbyeChannelId,
                    staffRoleIds: JSON.stringify(gc.staffRoleIds||[]), moderatorRoleIds: JSON.stringify(gc.moderatorRoleIds||[]),
                    modules: JSON.stringify(c.modules||{}), automod: JSON.stringify(c.automod||{}), orders: JSON.stringify(gc.orders||{})
                }, create:{
                    guildId, logChannelId: gc.logChannelId, modLogChannelId: gc.modLogChannelId, welcomeChannelId: gc.welcomeChannelId, goodbyeChannelId: gc.goodbyeChannelId,
                    staffRoleIds: JSON.stringify(gc.staffRoleIds||[]), moderatorRoleIds: JSON.stringify(gc.moderatorRoleIds||[]),
                    modules: JSON.stringify(c.modules||{}), automod: JSON.stringify(c.automod||{}), orders: JSON.stringify(gc.orders||{})
                }}).catch(()=>{});
            }
            if(c.levelCfg) await this.prisma.levelConfig.upsert({ where:{ guildId }, update:{ xpMultiplier:c.levelCfg.xpMultiplier, channelMultipliers: JSON.stringify(c.levelCfg.channelMultipliers||{}), roleRewards: JSON.stringify(c.levelCfg.roleRewards||[]), announceChannelId: c.levelCfg.announceChannelId }, create:{ guildId, xpMultiplier: c.levelCfg.xpMultiplier||1.0, channelMultipliers: JSON.stringify(c.levelCfg.channelMultipliers||{}), roleRewards: JSON.stringify(c.levelCfg.roleRewards||[]) }}).catch(()=>{});
            if(c.economyCfg) await this.prisma.economyConfig.upsert({ where:{ guildId }, update:{ dailyAmount:c.economyCfg.dailyAmount, weeklyAmount:c.economyCfg.weeklyAmount }, create:{ guildId, dailyAmount:c.economyCfg.dailyAmount||100, weeklyAmount:c.economyCfg.weeklyAmount||500 }}).catch(()=>{});
            // Restore ticket types (upsert)
            for(const tt of (c.ticketTypes||[])){
                await this.prisma.ticketType.upsert({ where:{ guildId_key:{ guildId, key: tt.key }}, update:{ displayName: tt.displayName, description: tt.description, emoji: tt.emoji, categoryId: tt.categoryId, staffRoleIds: tt.staffRoleIds, moderatorRoleIds: tt.moderatorRoleIds }, create:{ guildId, panelType: tt.panelType, key: tt.key, displayName: tt.displayName, description: tt.description, emoji: tt.emoji, categoryId: tt.categoryId, staffRoleIds: tt.staffRoleIds, moderatorRoleIds: tt.moderatorRoleIds }}).catch(()=>{});
            }
            // Reaction roles not destructive: add missing
            for(const rr of (c.reactionRoles||[])){
                await this.prisma.reactionRole.upsert({ where:{ guildId_messageId_emoji:{ guildId, messageId: rr.messageId, emoji: rr.emoji }}, update:{ roleId: rr.roleId }, create:{ guildId, channelId: rr.channelId, messageId: rr.messageId, emoji: rr.emoji, roleId: rr.roleId }}).catch(()=>{});
            }
            for(const si of (c.shopItems||[])){
                await this.prisma.shopItem.upsert({ where:{ guildId_name:{ guildId, name: si.name }}, update:{ price: si.price, description: si.description, roleId: si.roleId, emoji: si.emoji }, create:{ guildId, name: si.name, price: si.price, description: si.description, roleId: si.roleId, emoji: si.emoji }}).catch(()=>{});
            }
            await this.client?.services?.audit?.log(guildId,{ actorId:actor.id, action:"backup_restore", category:"config", details:{ backupId }}).catch(()=>{});
            return true;
        }catch(e){ logger.error("backup","restore failed",e); throw e; }
    }
}
