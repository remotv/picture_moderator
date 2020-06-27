const WebSocket = require('ws')
const Discord = require('discord.js')
const settings = require("./settings.json");

ws = new WebSocket(settings.ws_url);

let imageQueue = [];

const pictureChannel = '721553421533970442';

const client = new Discord.Client();
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

client.on("message", message => {
    if (message.channel.name === "picture-moderation") {
        const content = message.content.split(/ +/);
        if (content[0] === "approve") {
            approveImage(content[1]);
        } else if (content[0] === "deny") {
            approveImage(content[1], false);
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
            client.channels.get(pictureChannel).send(`${data.d.error}\n${data.d.details}`)
        } else if (data.d) {
            removeImageFromQueue(data.d.id);
            client.channels.get(pictureChannel).send(`${data.d.status} ${data.d.id}`)
        }
        
    } else if (data.e === "INTERNAL_REQUEST_IMG_APPROVAL") {
        imageQueue.push(data.d.image);
        const embed = new Discord.RichEmbed()
            .setTitle("New image to approve")
            .setColor(0x0099FF)
            .setImage(data.d.path)
            .setDescription(`Uploaded by ${data.d.user.username}\n${data.d.image.id}`);

        client.channels.get(pictureChannel).send(embed);

    }
}

const approveImage = (id, approved = true) => {
    console.log("Trying to approve image")
    try {

        const i = imageQueue.filter(image => image.id === id);
        const image = i[0]
        image.approved = approved;
        console.log(image);
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
    } catch (e) {
        console.log("Failed to approve image", e);
    }
}

const removeImageFromQueue = (id) => {
    const i = imageQueue.filter(image => image.id === id);
    const image = i[0]
    imageQueue.pop(image)
}