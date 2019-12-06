exports.status = ((req, res) =>
    /**
     * Get status (health check for FB)
     * @param req
     * @param res
     */
    res.status(200).send(`I'm alive!`).end());
