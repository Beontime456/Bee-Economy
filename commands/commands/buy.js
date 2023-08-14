const { SlashCommandBuilder } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'playerinfo.sqlite',
});

const playerinformation = sequelize.define('playerinformation', {
    playerid: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    money: DataTypes.INTEGER,
    beeSlots: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
playerinformation.sync();

const playerbees = sequelize.define('playerbees', {
    playerid: DataTypes.STRING,
    beeid: DataTypes.INTEGER,
    beeRarity: DataTypes.STRING,
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
    beeBaseRarity: DataTypes.STRING,
    findType: DataTypes.STRING,
    beePrice: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
beelist.sync();

function capitaliseWords(sentence) {
    return sentence.replace(/\b\w/g, char => char.toUpperCase());
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('buy')
		.setDescription('Buy a bee from the bee shop')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The bee you want to buy')
                .setRequired(true)
                .setAutocomplete(true),
        ),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const choices = [];
        const shopChoices = await beelist.findAll({ where: { findType: 'shop' } });
        for (let count = 0; count < shopChoices.length; count++) {
            const findItems = await beelist.findOne({ where: { beeid: shopChoices[count].dataValues.beeid } });
            choices.push(findItems.get('beeName'));
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
            const findplayer = await playerinformation.findOne({ where: { playerid: interaction.user.id } });
            if (findplayer != null) {
                const findBee = await beelist.findOne({ where: { beeName: requestbee, findType: 'shop' } });
                if (findplayer.get('money') >= findBee.get('beePrice')) {
                    if (findplayer.get('beeSlots') > await playerbees.count({ where: { playerid: interaction.user.id } })) {
                        await playerbees.create({
                            playerid: interaction.user.id,
                            beeid: findBee.get('beeid'),
                            beeRarity: findBee.get('beeBaseRarity'),
                        });
                        await findplayer.update({ money: findplayer.get('money') - findBee.get('beePrice') });
                        interaction.reply(`Bought the ${capitaliseWords(findBee.get('beeName'))}!`);
                    }
                    else {
                        interaction.reply('You don\'t have enough bee slots for another bee! Get some more bozo');
                    }
                }
                else {
                    interaction.reply('You are too poor lmao');
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