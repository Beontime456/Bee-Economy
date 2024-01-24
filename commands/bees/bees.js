// Use required dependencies in the command
const { SlashCommandBuilder } = require('discord.js');
const { Sequelize } = require('sequelize');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Initialise connection to the database
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'playerinfo.sqlite',
});

// Use required tables for the command
const playerinformation = require('C:/Bee Economy/models/playerinformation.js')(sequelize, Sequelize.DataTypes);
const playerbees = require('C:/Bee Economy/models/playerbees.js')(sequelize, Sequelize.DataTypes);
const beelist = require('C:/Bee Economy/models/beelist.js')(sequelize, Sequelize.DataTypes);
const skills = require('C:/Bee Economy/models/skills.js')(sequelize, Sequelize.DataTypes);

playerinformation.sync();
playerbees.sync();
beelist.sync();
skills.sync();

// Required functions
function capitaliseWords(sentence) {
    return sentence.replace(/\b\w/g, char => char.toUpperCase());
}
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
		.setName('bees')
		.setDescription('Check out your bees')
        .addUserOption(option => option.setName('user').setDescription('Check another player\'s bees')),
	async execute(interaction, isSlash, args, client) {
        // Checks if the command was initiated through slash or text.
        let requestplayer = undefined;
        let interactionAuth = undefined;
        if (!isSlash) {
            let userid = interaction.author.id;
            if (args.length > 0) {
                userid = args[0];
            }
            const mentionId = userid.replace(/[\\<>@#&!]/g, '');
            requestplayer = await client.users.fetch(mentionId);
            interactionAuth = interaction.author;
        }

        else {
            requestplayer = interaction.options.getUser('user');
            interactionAuth = interaction.user;
        }
        const findplayer = await playerinformation.findOne({ where: { playerid: interactionAuth.id } });
        // Identify if the user supplied an argument for a userid or user mention.
        if (requestplayer == undefined) {
            try {
                // Creates an array of embeds that function as "pages"
                const findPlayerBees = await playerbees.findAll({ where: { playerid: interactionAuth.id }, order: sequelize.literal('IBI ASC') });
                let pages = Math.ceil(findPlayerBees.length / 3);
                if (pages === 0) {
                    pages = 1;
                }
                const embeds = [];
                for (let page = 0; page < pages; page++) {
                    const beeFields = [];
                    const startIndex = page * 3;
                    const beesOnPage = findPlayerBees.slice(startIndex, startIndex + 3);
                    const beeembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${interactionAuth.displayName}'s bees - Page ${page + 1}`, iconURL: interactionAuth.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields(
                            { name: 'Bees', value: `These are all your bees. They are crucial for progression. \nIBI stands for Individual Bee Identifier and is used to distinguish specific bees from each other. \n\nBee slots: ${await playerbees.count({ where: { playerid: interactionAuth.id } })}/${findplayer.get('beeSlots')}` },
                        );
                    for (let count = 0; count < beesOnPage.length; count++) {
                        const nextBee = await beelist.findOne({ where: { beeid: beesOnPage[count].dataValues.beeid } });
                        const nextBeeSkills = JSON.parse(beesOnPage[count].dataValues.skills);
                        let skillText = '';
                        if (nextBeeSkills.length > 0) {
                            for (const skill in nextBeeSkills) {
                                const findSkill = await skills.findOne({ where: { skillid: nextBeeSkills[skill][0] } });
                                skillText += `\n${capitaliseWords(findSkill.get('skillName'))} Lv ${nextBeeSkills[0][1]}`;
                            }
                        }
                        beeFields.push({ name: `\`IBI: ${beesOnPage[count].dataValues.IBI}\` <:Basic_Bee:1149318543553351701> ${capitaliseWords(nextBee.get('beeName'))} (${nextBee.get('beeGrade')})`, value: `Tier: ${beesOnPage[count].dataValues.beeTier}/10 \nLevel: ${beesOnPage[count].dataValues.beeLevel}/150 \nPower: ${await calculateBeePower(beesOnPage[count])} \nHealth: ${beesOnPage[count].dataValues.beeHealth} \nSkills: ${skillText}`, inline: true });
                    }
                    if (beeFields.length === 0) {
                        beeembed.addFields({ name: '\u200b', value: 'You have no bees :( \n Buy some at the shop (bee shop)' });
                    }
                    for (let count = 0; count < beeFields.length; count++) {
                        beeembed.addFields(beeFields[count]);
                    }
                    embeds.push(beeembed);
                }
                // Creates the buttons for cycling through pages. The buttons last for 90 seconds (90000 milliseconds)
                if (embeds.length > 1) {
                    const row = new ActionRowBuilder()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('firstPage')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⏪'),
                        new ButtonBuilder()
                            .setCustomId('prevPage')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('◀️'),
                        new ButtonBuilder()
                            .setCustomId('nextPage')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('▶️'),
                        new ButtonBuilder()
                            .setCustomId('lastPage')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⏩'),
                    ]);
                    let currentPage = 0;
                    const embedMessage = await interaction.reply({ embeds: [embeds[0]], components: [row] });
                    const collector = interaction.channel.createMessageComponentCollector({ time: 90000 });
                    collector.on('collect', async i => {
                        if (interactionAuth.id === findplayer.get('playerid')) {
                            if (!i.deferred) {
                                await i.deferUpdate();
                            }
                            if (i.customId === 'firstPage') {
                                currentPage = 0;
                            }
                            else if (i.customId === 'prevPage') {
                                currentPage = (currentPage - 1 + embeds.length) % embeds.length;
                            }
                            else if (i.customId === 'nextPage') {
                                currentPage = (currentPage + 1) % embeds.length;
                            }
                            else if (i.customId === 'lastPage') {
                                currentPage = embeds.length - 1;
                            }
                            await embedMessage.edit({ embeds: [embeds[currentPage]], components: [row] });
                        }
                    });
                }
                else {
                    await interaction.reply({ embeds: [embeds[0]] });
                }
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    await interaction.reply('You haven\'t started yet! Use `bee start` to start!');
                    console.log(error);
                }
                else {
                    await interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
        }
        else {
            try {
                // Creates an array of embeds that function as "pages"
                const findPlayerBees = await playerbees.findAll({ where: { playerid: requestplayer.id }, order: sequelize.literal('IBI ASC') });
                const findTarget = await playerinformation.findOne({ where: { playerid: requestplayer.id } });
                let pages = Math.ceil(findPlayerBees.length / 3);
                if (pages === 0) {
                    pages = 1;
                }
                const embeds = [];
                for (let page = 0; page < pages; page++) {
                    const beeFields = [];
                    const startIndex = page * 3;
                    const beesOnPage = findPlayerBees.slice(startIndex, startIndex + 3);
                    const beeembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${requestplayer.displayName}'s bees - Page ${page + 1}`, iconURL: requestplayer.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields(
                            { name: 'Bees', value: `These are all your bees. They will do various things for you, and are very useful to you. \nIBI stands for Individual Bee Identifier and should be used when selling or doing other actions on specific bees. \n\nBee slots: ${await playerbees.count({ where: { playerid: requestplayer.id } })}/${findTarget.get('beeSlots')}` },
                        );
                    for (let count = 0; count < beesOnPage.length; count++) {
                        const nextBee = await beelist.findOne({ where: { beeid: beesOnPage[count].dataValues.beeid } });
                        const nextBeeSkills = JSON.parse(beesOnPage[count].dataValues.skills);
                        let skillText = '';
                        if (nextBeeSkills.length > 0) {
                            for (const skill in nextBeeSkills) {
                                const findSkill = await skills.findOne({ where: { skillid: nextBeeSkills[skill][0] } });
                                skillText += `\n${capitaliseWords(findSkill.get('skillName'))} Lv ${nextBeeSkills[0][1]}`;
                            }
                        }
                        beeFields.push({ name: `\`IBI: ${beesOnPage[count].dataValues.IBI}\` <:Basic_Bee:1149318543553351701> ${capitaliseWords(nextBee.get('beeName'))}`, value: `Grade: ${nextBee.get('beeGrade')} \nTier: ${beesOnPage[count].dataValues.beeTier}/10 \nLevel: ${beesOnPage[count].dataValues.beeLevel}/150 \nPower: ${await calculateBeePower(beesOnPage[count])} \nHealth: ${beesOnPage[count].dataValues.beeHealth} \nSkills: ${skillText}`, inline: true });
                    }
                    if (beeFields.length === 0) {
                        beeembed.addFields({ name: '\u200b', value: 'You have no bees :( \n Buy some at the shop (bee shop)' });
                    }
                    for (let count = 0; count < beeFields.length; count++) {
                        beeembed.addFields(beeFields[count]);
                    }
                    embeds.push(beeembed);
                }
                // Creates the buttons for cycling through pages. The buttons last for 90 seconds (90000 milliseconds)
                if (embeds.length > 1) {
                    const row = new ActionRowBuilder()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId('firstPage')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⏪'),
                        new ButtonBuilder()
                            .setCustomId('prevPage')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('◀️'),
                        new ButtonBuilder()
                            .setCustomId('nextPage')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('▶️'),
                        new ButtonBuilder()
                            .setCustomId('lastPage')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⏩'),
                    ]);
                    let currentPage = 0;
                    const embedMessage = await interaction.reply({ embeds: [embeds[0]], components: [row] });
                    const collector = interaction.channel.createMessageComponentCollector({ time: 90000 });
                    collector.on('collect', async i => {
                        if (i.user.id === interactionAuth.id) {
                            if (!i.deferred) {
                                await i.deferUpdate();
                            }
                            if (i.customId === 'firstPage') {
                                currentPage = 0;
                            }
                            else if (i.customId === 'prevPage') {
                                currentPage = (currentPage - 1 + embeds.length) % embeds.length;
                            }
                            else if (i.customId === 'nextPage') {
                                currentPage = (currentPage + 1) % embeds.length;
                            }
                            else if (i.customId === 'lastPage') {
                                currentPage = embeds.length - 1;
                            }
                            await embedMessage.edit({ embeds: [embeds[currentPage]], components: [row] });
                        }
                    });
                }
                else {
                    await interaction.reply({ embeds: [embeds[0]] });
                }
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    await interaction.reply('This player has not started!');
                }
                else if (error.name === 'DiscordAPIError[10013]') {
                    await interaction.reply('Please mention a player!');
                }
                else {
                    await interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
        }
    },
};
