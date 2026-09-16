const mqtt = require('mqtt')
const hex64 = require('hex64')
require('dotenv').config()
var options={
  port:process.env.MQTT_PORT,
  host:process.env.MQTT_HOST,
  protocol:process.env.MQTT_PROTOCOL,
  username:process.env.MQTT_USERNAME,
  password:process.env.MQTT_PASSWORD,
  }
const notfound ={
    headers:{
        status:404
    },
    body:{
        message:'Not Found'
    }
}

const empty ={
    headers:{
        status:500
    },
    body:{
        message:'field cannot empty'
    }
}

const connection ={
    headers:{
        status:500
    },
    body:{
        message:'Connection closed'
    }
}
module.exports={
    topUp:(data)=>{
        let i=1
        let interval = null
        let topup = ''
        
        return new Promise((resolve, reject)=>{
           
            if (data.devEUI==undefined || data.topup==undefined) {
                return reject(empty)
            }
            const devEui = String(data.devEUI).toLowerCase().trim()
            const appId = data.applicationId || data.type || "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0"
            const fPort = data.fPort ? Number(data.fPort) : 112

            topup=parseInt(data.topup)
            topup = ('00000000' + topup.toString(16)).slice(-8)
            const topupBase64 = Buffer.from(topup, 'hex').toString('base64')

            const client = mqtt.connect(options)
            const topicDown = `application/${appId}/device/${devEui}/command/down`
            const topicUp = `application/${appId}/device/${devEui}/event/up`

            client.subscribe(topicUp, (err)=>{
                if (err) {
                    client.end()
                    return reject(connection);
                } else {
                    const payload = JSON.stringify({
                        devEui: devEui,
                        confirmed: true,
                        fPort: fPort,
                        data: topupBase64
                    })

                    client.publish(topicDown, payload, { qos: 1 })

                    interval=setInterval(()=>{
                        i++
                        if(i==30) {
                            client.end()
                            clearInterval(interval)
                            reject(notfound);
                        }
                    },1000)
                }
            })
            client.on('message', (topic, message) => {
                if (interval) clearInterval(interval)
                client.end()
                resolve(message.toString())
            });
        })
    }
}