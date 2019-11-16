const modeldownlink = require('../models/modelValve')

module.exports={
    valve : (req, res) =>{
        const data = req.body
        console.log(data);
        
        // if (typeof(data)=="object") {
        //     console.log(JSON.parse(JSON.stringify(data)));
        //     console.log('AWD');
                
        // }
        
        modeldownlink.getUplink(data)
            .then((result)=>res.status(200).json(JSON.parse(result)))
            .catch((err)=>res.status(500).json(err))
    }
}