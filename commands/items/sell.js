// Dependencies
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

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sell')
		.setDescription('Sell a bee or item you own')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The IBI of the bee or name of the item you want to sell')
                .setRequired(true),
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('How much of the item you want to sell')
                .setMaxValue(1000),
        ),
        async execute(interaction, isSlash, args) {
            // Determine if the command was initiated through slash or text
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
            try {
                // Identify the item that is being sold and how much of it OR what bee is being sold through IBI
                const findplayer = await playerinformation.findOne({ where: { playerid: interactionAuth.id } });
                // Check if it's an item or bee
                if (requestbee) {
                    const findItem = await items.findOne({ where: { itemName: requestbee } });
                    if (findItem != null) {
                        const findInvenItem = await inventory.findOne({ where: { playerid: interactionAuth.id, itemid: findItem.get('itemid') } });
                        if (findInvenItem) {
                            if (amountOfItem === 'all') {
                                amountOfItem = findInvenItem.get('itemAmount');
                            }
                            if (amountOfItem <= 0) {
                                await interaction.reply('The number has to be higher than 1 lmao');
                                return;
                            }
                            if (amountOfItem > findInvenItem.get('itemAmount')) {
                                await interaction.reply('You do not have enough of this item!');
                            }
                            else if (amountOfItem === findInvenItem.get('itemAmount') && amountOfItem != 1) {
                                await interaction.reply(`Sold ${amountOfItem} ${capitaliseWords(findItem.get('itemName'))}s for ${findItem.get('sellPrice') * amountOfItem} money!`);
                                await findInvenItem.destroy();
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * amountOfItem });
                            }
                            else if (amountOfItem > 1) {
                                await interaction.reply(`Sold ${amountOfItem} ${capitaliseWords(findItem.get('itemName'))}s for ${findItem.get('sellPrice') * amountOfItem} money!`);
                                await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') - amountOfItem });
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * amountOfItem });
                            }
                            else if (amountOfItem === 1 && amountOfItem === findInvenItem.get('itemAmount')) {
                                await interaction.reply(`Sold ${amountOfItem} ${capitaliseWords(findItem.get('itemName'))} for ${findItem.get('sellPrice') * amountOfItem} money!`);
                                await findInvenItem.destroy();
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * amountOfItem });
                            }
                            else {
                                await interaction.reply(`Sold ${amountOfItem} ${capitaliseWords(findItem.get('itemName'))} for ${findItem.get('sellPrice') * amountOfItem} money!`);
                                await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') - amountOfItem });
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * amountOfItem });
                            }
                        }
                        else {
                            await interaction.reply('You have to have the item lol');
                        }
                    }
                    else {
                        await interaction.reply('This isn\'t an existing item!');
                    }
                }
                else {
                    let beeTeam = JSON.parse(findplayer.get('beeTeam'));
                    const findBee = await playerbees.findOne({ where: { playerid: interactionAuth.id, IBI: amountOfItem } });
                    if (findBee != null) {
                        if (beeTeam.includes(findBee.get('IBI'))) {
                            const teamIndex = beeTeam.indexOf(findBee.get('IBI'));
                            beeTeam.splice(teamIndex, 1);
                        }
                        beeTeam = JSON.stringify(beeTeam);
                        const findBeeName = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                        await findBee.destroy();
                        await findplayer.update({ money: findplayer.get('money') + findBeeName.get('beePrice') / 2, beeTeam: beeTeam });
                        await interaction.reply(`Sold the ${capitaliseWords(findBeeName.get('beeName'))}!`);
                    }
                    else {
                        await interaction.reply('This isn\'t a bee you own!');
                    }
                }
            }
            catch (error) {
                await interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        },
};