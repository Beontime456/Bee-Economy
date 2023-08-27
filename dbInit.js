const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

const beeList = require('./models/beelist.js')(sequelize, Sequelize.DataTypes);
const itemList = require('./models/items.js')(sequelize, Sequelize.DataTypes);
const areaList = require('./models/area.js')(sequelize, Sequelize.DataTypes);
require('./models/inventory.js')(sequelize, Sequelize.DataTypes);
require('./models/playerinformation.js')(sequelize, Sequelize.DataTypes);
require('./models/playerbees.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
    const bees = [
        beeList.upsert({ beeName: 'basic bee', beeBaseTier: 1, findType: 'shop', beePrice: 50, beeGrade: 'E' }),
        beeList.upsert({ beeName: 'god bee', beeBaseTier: 1, findType: 'none', beePrice: 0, beeGrade: 'SS' }),
        beeList.upsert({ beeName: 'test bee', beeBaseTier: 99, findType: 'shop', beePrice: 10000000, beeGrade: 'F' }),
        beeList.upsert({ beeName: 'terrible backyard bee', beeBaseTier: 1, findType: 'backyard', beePrice: 0, beeGrade: 'F' }),
        beeList.upsert({ beeName: 'less terrible backyard bee', beeBaseTier: 1, findType: 'backyard', beePrice: 0, beeGrade: 'E' }),
        beeList.upsert({ beeName: 'mediocre backyard bee', beeBaseTier: 2, findType: 'backyard', beePrice: 0, beeGrade: 'D' }),
        beeList.upsert({ beeName: 'okay backyard bee', beeBaseTier: 3, findType: 'backyard', beePrice: 0, beeGrade: 'C' }),
        beeList.upsert({ beeName: 'pretty decent backyard bee', beeBaseTier: 3, findType: 'backyard', beePrice: 0, beeGrade: 'B' }),
        beeList.upsert({ beeName: 'good backyard bee', beeBaseTier: 3, findType: 'backyard', beePrice: 0, beeGrade: 'A' }),
        beeList.upsert({ beeName: 'very good backyard bee', beeBaseTier: 4, findType: 'backyard', beePrice: 0, beeGrade: 'S' }),
    ];
    const items = [
        itemList.upsert({ itemName: 'flower petal', sellPrice: 100, findType: 'backyard' }),
        itemList.upsert({ itemName: 'clash royale king', sellPrice: 1, findType: 'shop' }),
        itemList.upsert({ itemName: 'ancient shard', sellPrice: 10000, findType: 'shop' }),
    ];
    const areas = [
        areaList.upsert({ areaName: 'backyard' }),
    ];

    await Promise.all(bees);
    await Promise.all(items);
    await Promise.all(areas);
    console.log('Database synced');

    sequelize.close();
}).catch(console.error);