const bcrypt = require('bcrypt');
bcrypt.hash('test', 10).then(hash => {
    console.log('Hash:', hash);
    bcrypt.compare('test', hash).then(match => {
        console.log('Match:', match);
    });
}).catch(err => {
    console.error('Bcrypt error:', err);
});
