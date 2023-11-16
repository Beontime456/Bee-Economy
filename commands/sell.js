const { SlashCommandBuilder } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
    storage: 'playerinfo.db',
});

const playerinformation = sequelize.define('playerinformation', {
    playerid: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    money: DataTypes.INTEGER,
    beeSlots: DataTypes.INTEGER,
    energy: DataTypes.INTEGER,
    lastEnergyRegen: DataTypes.INTEGER,
    lastAdvClaim: DataTypes.INTEGER,
    area: DataTypes.STRING,
}, {
        timestamps: false,
    });
playerinformation.sync();

const playerbees = sequelize.define('playerbees', {
    playerid: DataTypes.STRING,
    IBI: DataTypes.INTEGER,
    beeid: DataTypes.INTEGER,
    beeLevel: DataTypes.INTEGER,
    beeTier: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
playerbees.sync();

const beelist = sequelize.define('beelist', {
    beeid: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    beeName: {
        type: DataTypes.STRING,
    },
    beeGrade: DataTypes.STRING,
    beeBaseTier: DataTypes.INTEGER,
    findType: DataTypes.STRING,
    beePrice: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
beelist.sync();

const items = sequelize.define('items', {
    itemid: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    itemName: DataTypes.STRING,
    sellPrice: DataTypes.INTEGER,
    findType: DataTypes.STRING,
    findChance: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
items.sync();

const inventory = sequelize.define('inventory', {
    playerid: {
        type: DataTypes.INTEGER,
    },
    itemid: {
        type: DataTypes.INTEGER,
    },
    itemAmount: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
inventory.sync();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sell')
		.setDescription('Sell a bee or item you own')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The bee or item you want to sell')
                .setRequired(true),
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('How much of the item you want to sell')
                .setMaxValue(1000),
        ),
        async execute(interaction) {
            function capitaliseWords(sentence) {
                return sentence.replace(/\b\w/g, char => char.toUpperCase());
            }
            try {
                const findplayer = await playerinformation.findOne({ where: { playerid: interaction.user.id } });
                if (findplayer) {
                    const requestbee = interaction.options.getString('name');
                    const amountOfItem = interaction.options.getInteger('amount');
                    const findItem = await items.findOne({ where: { itemName: requestbee } });
                    const findBee = await playerbees.findOne({ where: { playerid: interaction.user.id, IBI: amountOfItem } });
                        if (findItem != null) {
                            const findInvenItem = await inventory.findOne({ where: { playerid: interaction.user.id, itemid: findItem.get('itemid') } });
                            if (amountOfItem > findInvenItem.get('itemAmount')) {
                                interaction.reply('You do not have enough of this item!');
                            }
                            else if (amountOfItem === findInvenItem.get('itemAmount') && amountOfItem != 1) {
                                interaction.reply(`Sold ${amountOfItem} ${capitaliseWords(findItem.get('itemName'))}s!`);
                                await findInvenItem.destroy();
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * amountOfItem });
                            }
                            else if (amountOfItem > 1) {
                                interaction.reply(`Sold ${amountOfItem} ${capitaliseWords(findItem.get('itemName'))}s!`);
                                await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') - amountOfItem });
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * amountOfItem });
                            }
                            else if (amountOfItem === 1 && amountOfItem === findInvenItem.get('itemAmount')) {
                                interaction.reply(`Sold ${amountOfItem} ${capitaliseWords(findItem.get('itemName'))}!`);
                                await findInvenItem.destroy();
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * amountOfItem });
                            }
                            else {
                                interaction.reply(`Sold ${amountOfItem} ${capitaliseWords(findItem.get('itemName'))}!`);
                                await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') - amountOfItem });
                                await findplayer.update({ money: findplayer.get('money') + findItem.get('sellPrice') * amountOfItem });
                            }
                        }
                        else if (findBee != null) {
                            const findBeeName = await beelist.findOne({ where: { beeid: findBee.get('beeid') } });
                            await findBee.destroy();
                            await findplayer.update({ money: findplayer.get('money') + findBeeName.get('beePrice') / 2 });
                            interaction.reply(`Sold the ${capitaliseWords(findBeeName.get('beeName'))}!`);
                        }
                        else {
                            interaction.reply('This isn\'t an existing item or bee you own!');
                        }
                    }
                else {
                    interaction.reply('You have not started yet. Use `bee start` to start.');
                }
            }
            catch (error) {
                interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        },
};