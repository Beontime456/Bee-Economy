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
const questList = require('./models/quests.js')(sequelize, Sequelize.DataTypes);
require('./models/inventory.js')(sequelize, Sequelize.DataTypes);
require('./models/playerinformation.js')(sequelize, Sequelize.DataTypes);
require('./models/playerbees.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
    const bees = [
        beeList.upsert({ beeName: 'basic bee', beeBaseTier: 1, findType: 'shop', beePrice: 100, beeGrade: 'E', beeBasePower: 15 }),
        beeList.upsert({ beeName: 'god bee', beeBaseTier: 1, findType: 'none', beePrice: 0, beeGrade: 'SS', beeBasePower: 2000 }),
        beeList.upsert({ beeName: 'furrow bee', beeBaseTier: 1, findType: 'backyard', beePrice: 400, beeGrade: 'E', beeBasePower: 20 }),
        beeList.upsert({ beeName: 'hairy-footed flower bee', beeBaseTier: 1, findType: 'backyard', beePrice: 600, beeGrade: 'D', beeBasePower: 30 }),
        beeList.upsert({ beeName: 'mason bee', beeBaseTier: 1, findType: 'backyard', beePrice: 750, beeGrade: 'C', beeBasePower: 40 }),
        beeList.upsert({ beeName: 'barbeecue', beeBaseTier: 1, findType: 'backyard', beePrice: 1000, beeGrade: 'B', beeBasePower: 50 }),
    ];
    const items = [
        itemList.upsert({ itemName: 'flower petal', sellPrice: 100, findType: 'backyard', findChance: 25 }),
        itemList.upsert({ itemName: 'clash royale king', sellPrice: 1, findType: 'shop', findChance: 0 }),
        itemList.upsert({ itemName: 'ancient shard', sellPrice: 10000, findType: 'shop', findChance: 0 }),
    ];
    const areas = [
        areaList.upsert({ areaName: 'backyard' }),
        areaList.upsert({ areaName: 'pond' }),
        areaList.upsert({ areaName: 'beach' }),
        areaList.upsert({ areaName: 'farm' }),
        areaList.upsert({ areaName: 'city' }),
        areaList.upsert({ areaName: 'lake' }),
        areaList.upsert({ areaName: 'river' }),
        areaList.upsert({ areaName: 'swamp' }),
        areaList.upsert({ areaName: 'village' }),
        areaList.upsert({ areaName: 'valley' }),
        areaList.upsert({ areaName: 'plain' }),
        areaList.upsert({ areaName: 'desert' }),
        areaList.upsert({ areaName: 'forest' }),
        areaList.upsert({ areaName: 'ocean' }),
        areaList.upsert({ areaName: 'island' }),
        areaList.upsert({ areaName: 'badlands' }),
    ];
    const quests = [
        questList.upsert({ questid: 0, questInfo: '{ "name": "Humble Beginnings", "description": "You gotta start somewhere. Get familiar with your bees before leaving the backyard.", "requirements": { "money": 5000 }, "rewards": { "money": 2500, "bee": "Barbeecue", "bee slots": 1 } }' }),
    ];

    await Promise.all(bees);
    await Promise.all(items);
    await Promise.all(areas);
    await Promise.all(quests);

    console.log('Database synced');

    sequelize.close();
}).catch(console.error);