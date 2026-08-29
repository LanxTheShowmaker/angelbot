import { logger } from "../core/logger.js";
export class BrandingService {
    prisma; client;
    constructor(prisma, client){ this.prisma=prisma; this.client=client; }
    async get(guildId){
        try{
            let row=await this.prisma.guildBranding.findUnique({ where:{ guildId }}).catch(()=>null);
            if(!row){
                row=await this.prisma.guildBranding.create({ data:{ guildId }}).catch(()=>({ guildId, displayName:null, avatarUrl:null, bannerUrl:null, nickname:null }));
            }
            return row;
        }catch(e){ return { guildId, displayName:null, avatarUrl:null, bannerUrl:null, nickname:null }; }
    }
    async set(guildId, patch){
        const data={};
        if(patch.displayName!==undefined) data.displayName=patch.displayName ? String(patch.displayName).slice(0,32) : null;
        if(patch.avatarUrl!==undefined) data.avatarUrl=patch.avatarUrl || null;
        if(patch.bannerUrl!==undefined) data.bannerUrl=patch.bannerUrl || null;
        if(patch.nickname!==undefined) data.nickname=patch.nickname ? String(patch.nickname).slice(0,32) : null;
        try{
            return await this.prisma.guildBranding.upsert({ where:{ guildId }, update:data, create:{ guildId, ...data }});
        }catch(e){ logger.error("branding","set failed",e); return null; }
    }
    async applyNickname(guild){
        try{
            const branding=await this.get(guild.id);
            const me=guild.members.me;
            if(!me) return;
            const nick=branding.nickname || branding.displayName;
            if(nick && me.nickname!==nick){
                if(me.permissions.has("ChangeNickname") || guild.members.me.permissions.has("ManageNicknames")){
                    await me.setNickname(nick).catch(e=> logger.warn("branding","nickname failed",e.message));
                }
            }
        }catch(e){ logger.error("branding","apply failed",e); }
    }
    // Get effective display for embeds: per-server name/avatar or fallback to bot user
    async getDisplay(guild){
        const branding=await this.get(guild.id).catch(()=>null);
        const bot=this.client.user;
        return {
            name: branding?.displayName || branding?.nickname || bot?.username || "A.N.G.E.L.",
            icon: branding?.avatarUrl || bot?.displayAvatarURL() || guild.iconURL() || null,
            banner: branding?.bannerUrl || null,
        };
    }
}
