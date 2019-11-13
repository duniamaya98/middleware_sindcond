const mqtt = require('mqtt')
require('dotenv').config()
var options={
  port:process.env.MQTT_PORT,
  host:process.env.MQTT_HOST,
  protocol:process.env.MQTT_PROTOCOL,
  username:process.env.MQTT_USERNAME,
  password:process.env.MQTT_PASSWORD,
  }
module.exports={
    getUplink:(data)=>{
        return new Promise((resolve, reject)=>{
            console.log(data.devEUI);
            
            if (data.type==undefined || data.devEUI==undefined) {
                reject('field cannot empty')
            }
            const client = mqtt.connect(options)
            client.subscribe((`organization/DAS/application/${data.type}/node/${data.devEUI}/rx`),(err)=>{
                if (err) {
                    reject(err);
                }
            })
            client.on('message', (topic, message, packet) => {
                resolve(message.toString())
            });
        })
    }
}