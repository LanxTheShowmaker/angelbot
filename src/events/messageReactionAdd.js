export default {
    name: "messageReactionAdd",
    async execute(reaction, user, client){
        if(reaction.partial) await reaction.fetch().catch(()=>{});
        await client.services.starboard.handleReactionAdd(reaction, user).catch(()=>{});
    }
};
