const modeldownlinkValve = require('../models/modelValve')
const modeldownlinkTopup = require('../models/modelPrepayment')
const modeldownlinkinterval = require('../models/modelInterval')
const modeldownlinkmeter = require('../models/modelAdjust')
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
    },
    interval : (req, res) =>{
        const data = req.body
        modeldownlinkinterval.adjustInterval(data)
        .then((result)=>res.status(200).json(JSON.parse(result)))
        .catch((err)=>res.status(500).json(err))
    },
    setMeter : (req, res)=>{
        const data = req.body
        modeldownlinkmeter.setMeter(data)
        .then((result)=>res.status(200).json(JSON.parse(result)))
        .catch((err)=>res.status(500).json(err))
    },
    gateway : (req, res)=>{
        const data = req.body
        modeldownlinkmeter.gateway(data)
        .then((result)=>res.status(200).json(JSON.parse(result)))
        .catch((err)=>res.status(500).json(err))
    },
}