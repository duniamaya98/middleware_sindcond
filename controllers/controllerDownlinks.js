const modeldownlinkValve = require('../models/modelValve')
const modeldownlinkTopup = require('../models/modelPrepayment')

module.exports={
    valve : (req, res) =>{
        const data = req.body
        console.log(data);
        modeldownlinkValve.getUplink(data)
            .then((result)=>res.status(200).json(JSON.parse(result)))
            .catch((err)=>res.status(500).json(err))
    },
    topup : (req, res) =>{
        const data = req.body
        console.log(data);
        modeldownlinkTopup.topUp(data)
            .then((result)=>res.status(200).json(JSON.parse(result)))
            .catch((err)=>res.status(500).json(err))
    }
}