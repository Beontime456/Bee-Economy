// Use dependencies
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Sequelize } = require('sequelize');

// Initialise connection to the database
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

// Required tables
const playerinformation = require('C:/Bee Economy/models/playerinformation.js')(sequelize, Sequelize.DataTypes);
const playerbees = require('C:/Bee Economy/models/playerbees.js')(sequelize, Sequelize.DataTypes);
const beelist = require('C:/Bee Economy/models/beelist.js')(sequelize, Sequelize.DataTypes);
const items = require('C:/Bee Economy/models/items.js')(sequelize, Sequelize.DataTypes);
const inventory = require('C:/Bee Economy/models/inventory.js')(sequelize, Sequelize.DataTypes);

playerinformation.sync();
playerbees.sync();
beelist.sync();
items.sync();
inventory.sync();

// Required functions
function beeFact() {
    const beeFacts = ['Bumble bees are apart of the apidae bee family.', 'The average bumble bee life span is 4 weeks.', 'The majority of bumble bee species in Europe seemingly like the colours violet or blue.',
    'A honey bee can fly up to 15 miles per hour.', 'Bees are relatives of ants!', 'Male drone bees don\'t have a stinger.', 'Bees have 5 eyes.', 'Bees struggle distinguishing red colours compared to bluer tones.',
    'Worker bees communicate with dancing or shaking their bodies.', 'A bee flaps it\'s wings 200x per second.', 'Bees can experience PTSD-like symptoms.', 'Bees recognize different human faces.',
    'Bees like humans who take care of them!', 'Bees are usually optimistic when successfully foraging, but can become depressed if momentarily trapped by a predatory spider.',
    'The Megachilidae Bee family has the most diverse nesting habits. They construct hives using mud, gravel, resin, plant fiber, wood pulp, and leaf pulp.', 'The Megachilidae bee family builds their nests in cavities, mainly in rotting wood, using leaves.',
    'The Andrenidae bee family is collectively known as mining bees. It consists of solitary bees that nest on the ground!', 'Halictidae bees are all ground-nesting bees with extremely diverse levels of sociality. Some species can even switch between being social or solitary depending on their environment.',
    'The Halictidae family also known as \'Sweet\' bees, because of their small size (4-8mm) these insects comprise some groups which are metallic in appearance.', 'The Stenotritidae bee family is the smallest of the seven bee families with 2 subfamilies and 21 species. The family is only found in Australia and closely related to Colletidae.'];
    const randomFact = Math.floor(Math.random() * 20);
    return beeFacts[randomFact];
}
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
async function calculateBeePower(bee) {
    if (bee.dataValues) {
        const findBee = await beelist.findOne({ where: { beeid: bee.dataValues.beeid } });
        const beePower = Math.floor(findBee.get('beeBasePower') * (1.04 ** bee.dataValues.beeLevel) * (1.1 ** bee.dataValues.beeTier) * gradeMultipliers[findBee.get('beeGrade')]);
        return beePower;
    }
    else {
        const findBee = await beelist.findOne({ where: { beeid: bee.get('beeid') } });
        const beePower = Math.floor(findBee.get('beeBasePower') * (1.04 ** bee.get('beeLevel')) * (1.1 ** bee.get('beeTier')) * gradeMultipliers[findBee.get('beeGrade')]);
        return beePower;
    }
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('claim')
		.setDescription('Claim any resources your bees may have found.'),
	async execute(interaction, isSlash) {
        // Identify if a command was initiated through slash or text.
        let interactionAuth = undefined;
        if (isSlash) {
            interactionAuth = interaction.user;
        }
        else {
            interactionAuth = interaction.author;
        }
        try {
            // Identify the player and what bees they have in order to calculate rewards based on time spent away and bee power.
            const findplayer = await playerinformation.findOne({ where: { playerid: interactionAuth.id } });
            if (findplayer.get('energy') - 10 >= 0) {
                const claimTime = Date.now();
                const itemsAvailable = await items.findAll();
                const findAllBees = await playerbees.findAll({ where: { playerid: interactionAuth.id } });
                let beePowerMod = 0;
                for (let i = 0; i < findAllBees.length; i++) {
                    beePowerMod += await calculateBeePower(findAllBees[i]);
                }
                beePowerMod /= 750;
                const advTime = ((claimTime - findplayer.get('lastAdvClaim')) / 1000 / 60) * beePowerMod;
                const moneyGained = Math.floor(Math.random() * 11 * advTime);
                let itemsGained = 0;
                let text = '';
                text += `Money: ${moneyGained}`;
                for (let count = 0; count < itemsAvailable.length; count++) {
                    if (!itemsAvailable[count].dataValues.findType.includes(findplayer.get('area'))) { continue; }
                    itemsGained = Math.floor((0.8 + Math.random() * 0.5) * (itemsAvailable[count].dataValues.findChance * advTime));
                    if (itemsGained > 0) {
                        text += `\n${capitaliseWords(itemsAvailable[count].dataValues.itemName)}: ${itemsGained}`;
                    }
                    const findInvenItem = await inventory.findOne({ where: { itemid: itemsAvailable[count].dataValues.itemid, playerid: interactionAuth.id } });
                    if (findInvenItem) {
                        await findInvenItem.update({ itemAmount: findInvenItem.get('itemAmount') + itemsGained });
                    }
                    else {
                        await inventory.create({
                            playerid: interactionAuth.id,
                            itemid: itemsAvailable[count].dataValues.itemid,
                            itemAmount: itemsGained,
                        });
                    }
                    itemsGained = 0;
                }
                // Create an embed will all the rewards gained
                const advembed = new EmbedBuilder()
                    .setColor(0xffe521)
                    .setAuthor({ name: `${interactionAuth.displayName}'s adventuring results`, iconURL: interactionAuth.displayAvatarURL() })
                    .setFooter({ text: beeFact() })
                    .addFields({ name: 'The bees are back!', value: `You lost 10 energy :zap: \nThe bees brought with them: \n\n${text}` });
                await interaction.reply({ embeds: [advembed] });
                findplayer.update({ money: findplayer.get('money') + moneyGained, lastAdvClaim: claimTime, energy: findplayer.get('energy') - 10 });
            }
            else {
                await interaction.reply('You do not have enough energy to claim rewards! Try resting for a bit then come back.');
            }
        }
        catch (error) {
            await interaction.reply(`There was an error! ${error.name}: ${error.message}`);
            console.log(error);
        }
    },
};