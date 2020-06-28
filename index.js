const WebSocket = require('ws')
const Discord = require('discord.js')
const settings = require("./settings.json");
const fs = require('fs')

let state;

try {
    state = JSON.parse(fs.readFileSync('state.json'))
} catch(e){
    state = {images: {}}
    console.error("Failed to load state likely first run", e)
}

ws = new WebSocket(settings.ws_url);

const pictureChannelId = '721553421533970442';
const logChannelId = '726676835395567678';

const client = new Discord.Client({partials: ['MESSAGE', 'CHANNEL', 'REACTION']});
client.login(settings.discord_token)

ws.onopen = () => {

}

client.on("ready", () => {
    ws.send(JSON.stringify({
        e: 'INTERNAL_LISTENER_AUTHENTICATE',
        d: {
            key: settings.ws_token
        }
    }))
    
    console.log("ready");
})

client.on("messageReactionAdd", async (reaction, user) => {
    if (user.id === client.user.id) return

    if (reaction.partial) {
		try {
			await reaction.fetch()
		} catch (e){
            return
        }
    }

    if (reaction.message.author.id === client.user.id){
        for (image of Object.values(state.images)){
            if (reaction.message.id === image.message_id){
                if (reaction.emoji.name === '✅'){
                    approveImage(image.id, user.id);
                } else if (reaction.emoji.name === '❌'){
                    approveImage(image.id, user.id, false);
                }
            }
        }
    }
})

/**
 * example events
 * 
 * {    e: INTERNAL_REQUEST_IMG_APPROVAL
 *      d: {
 *          user: {
 *              username: butts
 *              id: user-
 *              session_id: ssin-
 *              created: 0
 *              type: null
 *              status: [Object]
 *      },
 *      image:
 *          id: imgs-
 *          user_id: user-
 *          created: ISOTimestamp
 *          approved: null
 *          ref: serv-
 *      },
 *      path: https://remo-image-store.sfo2.digitalocreanspaces.com/user/imgs-
 *      }
 * }
 * 
 * {    e: INTERNAL_APPROVE_IMG_RESULT
 *      d: {
 *          error: Error approving image...
 *      }
 * }
 * 
 */
ws.onmessage = async event => {
    // console.log(event.data)
    let data = JSON.parse(event.data);
    if (data.e === "INTERNAL_APPROVE_IMG_RESULT") {
        console.log(data)
        if (data.d && data.d.error) {
            const channel = await client.channels.fetch(pictureChannelId)
            await channel.send(`${data.d.error}\n${data.d.details}`)
        } else if (data.d) {
            const image = state.images[data.d.id]

            if (image){
                const channel = await client.channels.fetch(pictureChannelId)
                const msg = await channel.messages.fetch(image.message_id)
                await msg.delete()
                
                const logChannel = await client.channels.fetch(logChannelId)
    
                if (data.d.status.includes('approved')){
                    const embed = new Discord.MessageEmbed()
                    .setTitle("Image Approved")
                    .setColor('#00ff44')
                    .setImage(image.path)
                    .setDescription(`Uploaded by ${image.user.username}\n${image.id}\nApproved by <@${image.actioner}>`);
    
                    await logChannel.send(embed)
                } else {
                    const embed = new Discord.MessageEmbed()
                    .setTitle("Image Denied")
                    .setColor('#ff2200')
                    .setImage(image.path)
                    .setDescription(`Uploaded by ${image.user.username}\n${image.id}\nDenied by <@${image.actioner}>`);
    
                    await logChannel.send(embed)
                }

                removeImageFromQueue(image.id);
            }  
        }
        
    } else if (data.e === "INTERNAL_REQUEST_IMG_APPROVAL") {
        const image = data.d.image
        if (!state.images.hasOwnProperty(image.id)){;
            const embed = new Discord.MessageEmbed()
                .setTitle("New image to approve")
                .setColor(0x0099FF)
                .setImage(data.d.path)
                .setDescription(`Uploaded by ${data.d.user.username}\n${data.d.image.id}`);
    
            const channel = await client.channels.fetch(pictureChannelId)
            const msg = await channel.send(embed)
            state.images[image.id] = {...image, message_id: msg.id, path: data.d.path, user: data.d.user}
            saveState()
            await msg.react('✅')
            await msg.react('❌')

        }
    }
}

const approveImage = (id, actioner, approved = true) => {
    console.log("Trying to approve image")
    try {
        const image = state.images[id]
        if (image){
            image.approved = approved;
            image.actioner = actioner;

            ws.send(JSON.stringify({
                e: 'INTERNAL_APPROVE_IMG',
                d: {
                    id: image.id,
                    user_id: image.user_id,
                    created: image.created,
                    approved: image.approved,
                    ref: image.ref
                }
            }))

            saveState()
        }

    } catch (e) {
        console.log("Failed to approve image", e);
    }
}

const removeImageFromQueue = (id) => {
    delete state.images[id]
    saveState()
}

const saveState = () => {
    fs.writeFileSync('state.json', JSON.stringify(state))
}