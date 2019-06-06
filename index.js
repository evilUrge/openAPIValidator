const port = process.env.PORT || 3000;
require('./src/server').listen(port);
console.log(`Server is running on port ${port}`);