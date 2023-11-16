const { SlashCommandBuilder } = require('discord.js');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
    storage: 'playerinfo.db',
});

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

function capitaliseWords(sentence) {
    return sentence.replace(/\b\w/g, char => char.toUpperCase());
}

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
        const focusedOption = interaction.options.getFocused(true);
        const choices = [];
        const shopChoices = await beelist.findAll({ where: { findType: 'shop' } });
        for (let count = 0; count < shopChoices.length; count++) {
            const findItems = await beelist.findOne({ where: { beeid: shopChoices[count].dataValues.beeid } });
            choices.push(findItems.get('beeName'));
        }
        const itemChoices = await items.findAll({ where: { findType: 'shop' } });
        for (let count = 0; count < shopChoices.length; count++) {
            const findItems = await items.findOne({ where: { itemid: itemChoices[count].dataValues.itemid } });
            choices.push(findItems.get('itemName'));
        }

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
	async execute(interaction) {
        try {
            const requestbee = interaction.options.getString('name');
            let amountOfItem = interaction.options.getInteger('amount');
            if (!amountOfItem) {
                amountOfItem = 1;
            }
            const findplayer = await playerinformation.findOne({ where: { playerid: interaction.user.id } });
            if (findplayer != null) {
                const findBee = await beelist.findOne({ where: { beeName: requestbee, findType: 'shop' } });
                const findItem = await items.findOne({ where: { itemName: requestbee, findType: 'shop' } });
                if (findBee != null) {
                    if (findplayer.get('money') >= findBee.get('beePrice') * amountOfItem) {
                        if (findplayer.get('beeSlots') >= await playerbees.count({ where: { playerid: interaction.user.id } }) + amountOfItem) {
                            const findplayerbees = await playerbees.findAll({ where: { playerid: interaction.user.id }, order: sequelize.literal('IBI ASC') });
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
                                    playerid: interaction.user.id,
                                    IBI: nextIBI,
                                    beeid: findBee.get('beeid'),
                                    beeLevel: 1,
                                    beeTier: findBee.get('beeBaseTier'),
                                });
                            }
                            await findplayer.update({ money: findplayer.get('money') - findBee.get('beePrice') * amountOfItem });
                            if (amountOfItem > 1) {
                                interaction.reply(`Bought ${amountOfItem} ${capitaliseWords(findBee.get('beeName'))}s!`);
                            }
                            else {
                                interaction.reply(`Bought ${amountOfItem} ${capitaliseWords(findBee.get('beeName'))}!`);
                            }
                        }
                        else {
                            interaction.reply('You don\'t have enough bee slots for more bees! Get some more bozo');
                        }
                    }
                    else {
                        interaction.reply('You are too poor lmao');
                    }
                }
                else if (findItem != null) {
                    if (findplayer.get('money') >= findItem.get('sellPrice') * amountOfItem) {
                        const findInvenItem = await inventory.findOne({ where: { itemid: findItem.get('itemid'), playerid: interaction.user.id } });
                        if (findInvenItem === null) {
                            await inventory.create({
                                playerid: interaction.user.id,
                                itemid: findItem.get('itemid'),
                                itemAmount: 1 * amountOfItem,
                            });
                        }
                        else {
                            await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') + 1 * amountOfItem });
                        }
                        await findplayer.update({ money: findplayer.get('money') - findItem.get('sellPrice') * amountOfItem });
                        if (amountOfItem > 1) {
                            interaction.reply(`Bought ${amountOfItem} ${capitaliseWords(findItem.get('itemName'))}s!`);
                        }
                        else {
                            interaction.reply(`Bought the ${capitaliseWords(findItem.get('itemName'))}!`);
                        }
                    }
                    else {
                        interaction.reply('You are too poor lmao');
                    }
                }
                else {
                    interaction.reply('This isn\'t a buyable kind of bee or item!');
                }
            }
            else {
                interaction.reply('You have not started yet! Use bee start to start.');
            }
        }
        catch (error) {
            interaction.reply(`There was an error! ${error.name}: ${error.message}`);
        }
    },
};