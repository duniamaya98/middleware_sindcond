const mqtt = require('mqtt')
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
    gateway:(data)=>{
        let i=1
        let interval = null
        return new Promise((resolve, reject)=>{
            const client = mqtt.connect(options)
            client.subscribe(`gateway/7276ff00450101f9/stats`)

            client.on('message', (topic, message, packet) => {
                clearInterval(interval)
                console.log(message.toString())
                resolve(message.toString())
                client.end()
            }); 
            interval=setInterval(()=>{
                try {
                clearInterval(interval)
                throw new Error()
                } catch (error) {
                    reject({headers:{status:500},body:{messages:'request timout'}})
                }
            },35000)
        })
    }
}