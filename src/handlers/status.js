exports.status = (req, res) => {
    /**
     * Get status (health check for FB)
     * @param req
     * @param res
     */
    return res.status(200).send(`I'm alive!`).end();
};
