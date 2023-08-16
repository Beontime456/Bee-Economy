const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

const beeList = require('./models/beelist.js')(sequelize, Sequelize.DataTypes);
const itemList = require('./models/items.js')(sequelize, Sequelize.DataTypes);
require('./models/inventory.js')(sequelize, Sequelize.DataTypes);
require('./models/playerinformation.js')(sequelize, Sequelize.DataTypes);
require('./models/playerbees.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
    const bees = [
        beeList.upsert({ beeName: 'basic bee', beeBaseRarity: 'common', findType: 'shop', beePrice: 50 }),
        beeList.upsert({ beeName: 'god bee', beeBaseRarity: 'epic', findType: 'none', beePrice: 0 }),
        beeList.upsert({ beeName: 'test bee', beeBaseRarity: 'mythical', findType: 'shop', beePrice: 10000000 }),
    ];
    const items = [
        itemList.upsert({ itemName: 'flower petal', sellPrice: 100, findType: 'backyard' }),
        itemList.upsert({ itemName: 'clash royale king', sellPrice: 1, findType: 'shop' }),
        itemList.upsert({ itemName: 'ancient shard', sellPrice: 10000, findType: 'shop' }),
    ];

    await Promise.all(bees);
    await Promise.all(items);
    console.log('Database synced');

    sequelize.close();
}).catch(console.error);