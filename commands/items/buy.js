// Required dependencies
const { SlashCommandBuilder } = require('discord.js');
const { Sequelize } = require('sequelize');

// Initialise connection to the database
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

// Required tables
const beelist = require('C:/Bee Economy/models/beelist.js')(sequelize, Sequelize.DataTypes);
const items = require('C:/Bee Economy/models/items.js')(sequelize, Sequelize.DataTypes);
const inventory = require('C:/Bee Economy/models/inventory.js')(sequelize, Sequelize.DataTypes);
const playerinformation = require('C:/Bee Economy/models/playerinformation.js')(sequelize, Sequelize.DataTypes);
const playerbees = require('C:/Bee Economy/models/playerbees.js')(sequelize, Sequelize.DataTypes);

playerinformation.sync();
playerbees.sync();
beelist.sync();
items.sync();
inventory.sync();

// Required functions
function capitaliseWords(sentence) {
    return sentence.replace(/\b\w/g, char => char.toUpperCase());
}
const gradeMultipliers = {
    'F': 0.75,
    'E': 0.85,
    'D': 1,
    'C': 1.1,
    'B': 1.3,
    'A': 1.5,
    'S': 1.75,
    'SS': 2,
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('buy')
		.setDescription('Buy a bee from the bee shop')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The bee or item you want to buy')
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('How much of the item you want to buy')
                .setMaxValue(1000),
        ),
    async autocomplete(interaction) {
        // Autocomplete will show a series of results from both the items and bees tables depending on what you type in the name arg. Only through slash.
        const focusedOption = interaction.options.getFocused(true);
        const choices = [];
        const shopChoices = await beelist.findAll({ where: { findType: 'shop' } });
        for (let count = 0; count < shopChoices.length; count++) {
            const findItems = await beelist.findOne({ where: { beeid: shopChoices[count].dataValues.beeid } });
            choices.push(findItems.get('beeName'));
        }
        const itemChoices = await items.findAll();
        for (let count = 0; count < itemChoices.length; count++) {
            if (!itemChoices[count].dataValues.findType.includes('shop')) { continue; }
            const findItems = await items.findOne({ where: { itemid: itemChoices[count].dataValues.itemid } });
            choices.push(findItems.get('itemName'));
        }


        // Filters the options and feeds them to Discord to feed the player.
        const filtered = choices.filter(choice => choice.startsWith(focusedOption.value.toLowerCase()));
        let options;
        if (filtered.length > 25) {
            options = filtered.slice(0, 25);
        }
        else {
            options = filtered;
        }
        await interaction.respond(
            options.map(choice => ({ name: capitaliseWords(choice), value: choice })),
        );
    },
	async execute(interaction, isSlash, args) {
        // Determine command execution type and therefore where arguments are stored
        let requestbee = undefined;
        let amountOfItem = undefined;
        let interactionAuth = undefined;
        if (isSlash) {
            interactionAuth = interaction.user;
            requestbee = interaction.options.getString('name');
            amountOfItem = interaction.options.getInteger('amount');
            if (!amountOfItem) {
                amountOfItem = 1;
            }
        }
        else {
            interactionAuth = interaction.author;
            amountOfItem = args[args.length - 1];
            if (typeof parseInt(amountOfItem) === 'number' && Number.isNaN(parseInt(amountOfItem)) != true) {
                args.pop();
                amountOfItem = parseInt(amountOfItem);
            }
            else if (amountOfItem.toLowerCase() === 'all') {
                args.pop();
                amountOfItem = 'all';
            }
            else {
                amountOfItem = 1;
            }
            requestbee = args.join(' ').toLowerCase();
        }
        // Find the player and check if they were buying a bee or an item
        const findplayer = await playerinformation.findOne({ where: { playerid: interactionAuth.id } });
        const findBee = await beelist.findOne({ where: { beeName: requestbee } });
        const findItem = await items.findOne({ where: { itemName: requestbee } });
        if (findBee != null) {
            if (amountOfItem === 'all') { amountOfItem = Math.floor(findplayer.get('money') / findBee.get('beePrice')); }
            if (amountOfItem <= 0) { return interaction.reply('The number has to be at least 1 lmao'); }
            if (findplayer.get('money') < findBee.get('beePrice') * amountOfItem) { return interaction.reply('You are too poor lmao'); }
            if (findplayer.get('beeSlots') < await playerbees.count({ where: { playerid: interactionAuth.id } }) + amountOfItem) { return interaction.reply('You don\'t have enough bee slots for this many bees! Get some more bozo'); }
            // ...if they're looking for a bee, find the IBI to be used for the new bee, check conditions to make sure it's possible, and give the player the bee.
            const findplayerbees = await playerbees.findAll({ where: { playerid: interactionAuth.id }, order: sequelize.literal('IBI ASC') });
            for (let count = 0; count < amountOfItem; count++) {
                let nextIBI = 0;
                if (findplayerbees.length > 0) {
                    let currentIBI = await findplayerbees[nextIBI].dataValues.IBI;
                    while (nextIBI === currentIBI) {
                        nextIBI++;
                        if (findplayerbees[nextIBI] != undefined) {
                            currentIBI = await findplayerbees[nextIBI].dataValues.IBI;
                        }
                    }
                }
                await playerbees.create({
                    playerid: interactionAuth.id,
                    IBI: nextIBI,
                    beeid: findBee.get('beeid'),
                    beeLevel: 1,
                    beeTier: findBee.get('beeBaseTier'),
                    tierUpMod: 1,
                    beePower: Math.floor(findBee.get('beeBasePower') * gradeMultipliers[findBee.get('beeGrade')]),
                    beeHealth: 100,
                    skills: '[]',
                });
            }
            await findplayer.update({ money: findplayer.get('money') - findBee.get('beePrice') * amountOfItem });
            if (amountOfItem > 1) {
                await interaction.reply(`Bought ${amountOfItem} ${capitaliseWords(findBee.get('beeName'))}s for ${findBee.get('beePrice') * amountOfItem} money!`);
            }
            else {
                await interaction.reply(`Bought ${amountOfItem} ${capitaliseWords(findBee.get('beeName'))} for ${findBee.get('beePrice') * amountOfItem} money!`);
            }
        }
        else if (findItem != null) {
            if (!findItem.get('findType').includes('shop')) { return interaction.reply('This isn\'t a buyable item!'); }
            if (amountOfItem === 'all') {
                amountOfItem = Math.floor(findplayer.get('money') / findItem.get('sellPrice'));
            }
            if (amountOfItem <= 0) { return interaction.reply('The number has to be higher than 1 lmao'); }
            if (findplayer.get('money') < findItem.get('sellPrice') * amountOfItem) { return interaction.reply('You are too poor lmao'); }
            // ...if it's an item, check conditions, take their money and give them the item. If they have had the item before, just add to the total of that item, otherwise, create a new record for their item.
            const findInvenItem = await inventory.findOne({ where: { itemid: findItem.get('itemid'), playerid: interactionAuth.id } });
            if (findInvenItem === null) {
                await inventory.create({
                    playerid: interactionAuth.id,
                    itemid: findItem.get('itemid'),
                    itemAmount: 1 * amountOfItem,
                });
            }
            else {
                await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') + 1 * amountOfItem });
            }
            await findplayer.update({ money: findplayer.get('money') - findItem.get('sellPrice') * amountOfItem });
            if (amountOfItem > 1) {
                await interaction.reply(`Bought ${amountOfItem} ${capitaliseWords(findItem.get('itemName'))}s for ${findItem.get('sellPrice') * amountOfItem} money!`);
            }
            else {
                await interaction.reply(`Bought the ${capitaliseWords(findItem.get('itemName'))} for ${findItem.get('sellPrice') * amountOfItem} money!`);
            }
        }
        else {
            await interaction.reply('This isn\'t a buyable kind of bee or item!');
        }
    },
};