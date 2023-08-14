const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

const beeList = require('./models/beelist.js')(sequelize, Sequelize.DataTypes);
require('./models/playerinformation.js')(sequelize, Sequelize.DataTypes);
require('./models/playerbees.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
    const bees = [
        beeList.upsert({ beeName: 'basic bee', beeBaseRarity: 'common', findType: 'shop', beePrice: 100 }),
        beeList.upsert({ beeName: 'god bee', beeBaseRarity: 'epic', findType: 'none', beePrice: 0 }),
        beeList.upsert({ beeName: 'test bee', beeBaseRarity: 'trash', findType: 'shop', beePrice: 0 }),
    ];

    await Promise.all(bees);
    console.log('Database synced');

    sequelize.close();
}).catch(console.error);