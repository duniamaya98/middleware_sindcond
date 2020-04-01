const { SvcCheckNode } = require("../../services/V2/serviceCheckNode");
module.exports = {
  controllerCheckNode: (req, res) => {
    const data = req.body;
    SvcCheckNode(data)
      .then(result => res.json(result))
      .catch(err => res.json(err));
  }
};
