const { SvcSubscribe } = require("../../services/V2/serviceSubscribe");

module.exports = {
  controllerSubscribe: (req, res) => {
    const data = req.body;
    SvcSubscribe(data)
      .then(result => res.json(result))
      .catch(err => res.json(err));
  }
};
