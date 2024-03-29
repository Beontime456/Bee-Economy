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
const recipeList = require('./models/recipes.js')(sequelize, Sequelize.DataTypes);
const skillList = require('./models/skills.js')(sequelize, Sequelize.DataTypes);
require('./models/inventory.js')(sequelize, Sequelize.DataTypes);
require('./models/playerinformation.js')(sequelize, Sequelize.DataTypes);
require('./models/playerbees.js')(sequelize, Sequelize.DataTypes);
require('./models/claimbox.js')(sequelize, Sequelize.DataTypes);

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
        itemList.upsert({ itemName: 'flower petal', sellPrice: 100, findType:  '[\'backyard\']', findChance: 25 }),
        itemList.upsert({ itemName: 'clash royale king', sellPrice: 1, findType: '[\'shop\']', findChance: 0 }),
        itemList.upsert({ itemName: 'red crystal shard', sellPrice: 5000, findType: '[\'fight\']', findChance: 5 }),
        itemList.upsert({ itemName: 'green crystal shard', sellPrice: 5000, findType: '[\'fight\']', findChance: 5 }),
        itemList.upsert({ itemName: 'purple crystal shard', sellPrice: 10000, findType: '[\'fight\']', findChance: 2.5 }),
        itemList.upsert({ itemName: 'rainbow crystal shard', sellPrice: 200000, findType: '[\'fight\']', findChance: 0.01 }),
        itemList.upsert({ itemName: 'white crystal shard', sellPrice: 2500, findType: '[\'fight\']', findChance: 10 }),
        itemList.upsert({ itemName: 'charged crystal shard', sellPrice: 100, findType: '[\'fight\', \'backyard\']', findChance: 75 }),
    ];
    const areas = [
        areaList.upsert({ areaName: 'backyard' }),
        areaList.upsert({ areaName: 'pond' }),
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
        questList.upsert({ questid: 0, questInfo: { 'name': 'Humble Beginnings', 'description': 'You gotta start somewhere. Get familiar with your bees before leaving the backyard.', 'requirements': { 'money': 5000, 'flower petal': 10 }, 'rewards': { 'money': 2500, 'bee': 'Barbeecue', 'bee slots': 1 } } }),
    ];
    const recipes = [
        recipeList.upsert({ itemName: 'ancient shard', itemReqs: { 'ingredients': { 'flower petal': 10, 'clash royale king': 15 } } }),
    ];
    const skills = [
        skillList.upsert({ skillName: 'bee spin', skillRarity: 'D', skillType: 'active', skillCd: 3, skillTarget: 'enemy', skillTargetType: 'single', skillDetails: { 'damage': 30 } }),
        skillList.upsert({ skillName: 'bee swarm', skillRarity: 'E', skillType: 'active', skillCd: 2, skillTarget: 'enemy', skillTargetType: 'all', skillDetails: { 'damage': 10 } }),
        skillList.upsert({ skillName: 'healer', skillRarity: 'B', skillType: 'active', skillCd: 4, skillTarget: 'team', skillTargetType: 'single', skillDetails: { 'healing': 40 } }),
        skillList.upsert({ skillName: 'gun', skillRarity: 'S', skillType: 'active', skillCd: 0, skillTarget: 'enemy', skillTargetType: 'single', skillDetails: { 'damage': 69420 } }),
        skillList.upsert({ skillName: 'resilient', skillRarity: 'C', skillType: 'passive', skillDetails: { 'resistance': 1.1 } }),
        skillList.upsert({ skillName: 'angry', skillRarity: 'C', skillType: 'passive', skillDetails: { 'damageBoost': 1.1 } }),
        skillList.upsert({ skillName: 'tough', skillRarity: 'C', skillType: 'passive', skillDetails: { 'health': 1.1 } }),
        skillList.upsert({ skillName: 'knight', skillRarity: 'C', skillType: 'active', skillCd: 10, skillTarget: 'self', skillDetails: { 'resistance': 1.3 } }),
        skillList.upsert({ skillName: 'pollinator', skillRarity: 'A', skillType: 'passive', skillDetails: { 'teamStats': 1.05 } }),
        skillList.upsert({ skillName: 'forager', skillRarity: 'B', skillType: 'passive', skillDetails: { 'rewardBoost': 1.2 } }),
        skillList.upsert({ skillName: 'architect', skillRarity: 'A', skillType: 'hybrid', skillCd: 3, skillTarget: 'enemy', skillTargetType: 'single', skillDetails: { 'damage': 40, 'health': 1.2 } }),
    ];

    await Promise.all(bees);
    await Promise.all(items);
    await Promise.all(areas);
    await Promise.all(quests);
    await Promise.all(recipes);
    await Promise.all(skills);

    console.log('Database synced');

    sequelize.close();
}).catch(console.error);