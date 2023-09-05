const { SlashCommandBuilder } = require('discord.js');
const { Sequelize } = require('sequelize');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'playerinfo.sqlite',
});

const playerinformation = require('C:/Bee Economy/models/playerinformation.js')(sequelize, Sequelize.DataTypes);
const playerbees = require('C:/Bee Economy/models/playerbees.js')(sequelize, Sequelize.DataTypes);
const beelist = require('C:/Bee Economy/models/beelist.js')(sequelize, Sequelize.DataTypes);

playerinformation.sync();
playerbees.sync();
beelist.sync();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bees')
		.setDescription('Check out your bees')
        .addUserOption(option => option.setName('user').setDescription('Check another player\'s bees')),
	async execute(interaction) {
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
        const requestplayer = interaction.options.getUser('user');
        const findplayer = await playerinformation.findOne({ where: { playerid: interaction.user.id } });
        if (requestplayer == undefined) {
                try {
                    const findPlayerBees = await playerbees.findAll({ where: { playerid: interaction.user.id }, order: sequelize.literal('IBI ASC') });
                    let pages = Math.ceil(findPlayerBees.length / 6);
                    if (pages === 0) {
                        pages = 1;
                    }
                    const embeds = [];
                    for (let page = 0; page < pages; page++) {
                        const beeFields = [];
                        const startIndex = page * 6;
                        const beesOnPage = findPlayerBees.slice(startIndex, startIndex + 6);
                        const beeembed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${interaction.user.username}'s bees - Page ${page + 1}`, iconURL: interaction.user.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields(
                                { name: 'Bees', value: `These are all your bees. They will do various things for you, and are very useful to you. \nIBI stands for Individual Bee Identifier and should be used when selling or doing other actions on specific bees. \n\nBee slots: ${await playerbees.count({ where: { playerid: interaction.user.id } })}/${findplayer.get('beeSlots')}` },
                            );
                        for (let count = 0; count < beesOnPage.length; count++) {
                            const nextBee = await beelist.findOne({ where: { beeid: beesOnPage[count].dataValues.beeid } });
                            beeFields.push({ name: `\`IBI: ${beesOnPage[count].dataValues.IBI}\` <:Basic_Bee:1146241212169339030> ${capitaliseWords(nextBee.get('beeName'))}`, value: `Grade: ${nextBee.get('beeGrade')} \nTier: ${beesOnPage[count].dataValues.beeTier} \nLevel: ${beesOnPage[count].dataValues.beeLevel}`, inline: true });
                        }
                        if (beeFields.length === 0) {
                            beeembed.addFields({ name: '\u200b', value: 'You have no bees :( \n Buy some at the shop (bee shop)' });
                        }
                        for (let count = 0; count < beeFields.length; count++) {
                            beeembed.addFields(beeFields[count]);
                        }
                        embeds.push(beeembed);
                    }
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
                        interaction.reply({ embeds: [embeds[0]], components: [row] });
                        const collector = interaction.channel.createMessageComponentCollector({ time: 90000 });
                        collector.on('collect', async i => {
                            if (interaction.user.id === findplayer.get('playerid')) {
                                if (!i.deferred) {
                                    i.deferUpdate();
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
                                await interaction.editReply({ embeds: [embeds[currentPage]], components: [row] });
                            }
                        });
                    }
                    else {
                        interaction.reply({ embeds: [embeds[0]] });
                    }
                }
                catch (error) {
                    if (error.name === 'TypeError') {
                        interaction.reply('You haven\'t started yet! Use `bee start` to start!');
                        console.log(error);
                    }
                    else {
                        interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                        console.log(error);
                    }
                }
        }
        else {
            try {
                const findPlayerBees = await playerbees.findAll({ where: { playerid: requestplayer.id }, order: sequelize.literal('IBI ASC') });
                const findTarget = await playerinformation.findOne({ where: { playerid: requestplayer.id } });
                let pages = Math.ceil(findPlayerBees.length / 6);
                if (pages === 0) {
                    pages = 1;
                }
                const embeds = [];
                for (let page = 0; page < pages; page++) {
                    const beeFields = [];
                    const startIndex = page * 6;
                    const beesOnPage = findPlayerBees.slice(startIndex, startIndex + 6);
                    const beeembed = new EmbedBuilder()
                        .setColor(0xffe521)
                        .setAuthor({ name: `${requestplayer.username}'s bees - Page ${page + 1}`, iconURL: requestplayer.displayAvatarURL() })
                        .setFooter({ text: beeFact() })
                        .addFields(
                            { name: 'Bees', value: `These are all your bees. They will do various things for you, and are very useful to you. \nIBI stands for Individual Bee Identifier and should be used when selling or doing other actions on specific bees. \n\nBee slots: ${await playerbees.count({ where: { playerid: requestplayer.id } })}/${findTarget.get('beeSlots')}` },
                        );
                    for (let count = 0; count < beesOnPage.length; count++) {
                        const nextBee = await beelist.findOne({ where: { beeid: beesOnPage[count].dataValues.beeid } });
                        beeFields.push({ name: `\`IBI: ${beesOnPage[count].dataValues.IBI}\` <:Basic_Bee:1146241212169339030> ${capitaliseWords(nextBee.get('beeName'))}`, value: `Grade: ${nextBee.get('beeGrade')} \nTier: ${beesOnPage[count].dataValues.beeTier} \nLevel: ${beesOnPage[count].dataValues.beeLevel}`, inline: true });
                    }
                    if (beeFields.length === 0) {
                        beeembed.addFields({ name: '\u200b', value: 'You have no bees :( \n Buy some at the shop (bee shop)' });
                    }
                    for (let count = 0; count < beeFields.length; count++) {
                        beeembed.addFields(beeFields[count]);
                    }
                    embeds.push(beeembed);
                }
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
                    const embedMessage = interaction.reply({ embeds: [embeds[0]], components: [row] });
                    const collector = interaction.channel.createMessageComponentCollector({ time: 90000 });
                    collector.on('collect', async i => {
                        if (interaction.user.id === findplayer.get('playerid')) {
                            if (!i.deferred) {
                                i.deferUpdate();
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
                            await embedMessage.editReply({ embeds: [embeds[currentPage]], components: [row] });
                        }
                    });
                }
                else {
                    interaction.reply({ embeds: [embeds[0]] });
                }
            }
            catch (error) {
                if (error.name === 'TypeError') {
                    interaction.reply('This player has not started!');
                }
                else if (error.name === 'DiscordAPIError[10013]') {
                    interaction.reply('Please mention a player!');
                }
                else {
                    interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                    console.log(error);
                }
            }
        }
    },
};
