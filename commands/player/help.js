const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// This command should have its function majorly changed in the near future for info on individual commands.

// Function for the footer of an embed.
function beeFact() {
    const beeFacts = ['Bumble bees are apart of the apidae bee family.', 'The average bumble bee life span is 4 weeks.', 'The majority of bumble bee species in Europe seemingly like the colours violet or blue.',
    'A honey bee can fly up to 15 miles per hour.', 'Bees are relatives of ants!', 'Male drone bees don\'t have a stinger.', 'Bees have 5 eyes.', 'Bees struggle distinguishing red colours compared to bluer tones.',
    'Worker bees communicate with dancing or shaking their bodies.', 'A bee flaps it\'s wings 200x per second.', 'Bees can experience PTSD-like symptoms.', 'Bees recognize different human faces.',
    'Bees like humans who take care of them!', 'Bees are usually optimistic when successfully foraging, but can become depressed if momentarily trapped by a predatory spider.',
    'The Megachilidae Bee family has the most diverse nesting habits. They construct hives using mud, gravel, resin, plant fiber, wood pulp, and leaf pulp.', 'The Megachilidae bee family builds their nests in cavities, mainly in rotting wood, using leaves.',
    'The Andrenidae bee family is collectively known as mining bees. It consists of solitary bees that nest on the ground!'];
    const randomFact = Math.floor(Math.random() * beeFacts.length);
    return beeFacts[randomFact];
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Check out available commands and tips on what to do.'),
	async execute(interaction, isSlash) {
        // Check if the command was initiated as a slash command or not.
        let interactionAuth = undefined;
        if (isSlash) {
            interactionAuth = interaction.user;
        }
        else {
            interactionAuth = interaction.author;
        }
        const helpembed = new EmbedBuilder()
            .setColor(0xffe521)
            .setFooter({ text: beeFact() })
            .setAuthor({ name: 'Help', iconURL: interactionAuth.displayAvatarURL() })
            .addFields(
            { name: 'Help', value: 'Hello! If you are using this command chances are you\'re new here. If not, go down to find the available commands.' },
            { name: 'Commands', value: '- start - Starts your adventure \n- profile - Displays your stats \n- bees - Shows the bees you own \n- shop - Shows the bee shop \n- buy - Lets you buy a bee or item from the bee shop \n- sell - Sells an item or bee of your choice. To sell bees, use their IBI \n- inventory - Lets you check all the items in your inventory \n- find - Go looking for a bee in your current area. \n- claim - Claim anything found by your bees while they work.' });
        interaction.reply({ embeds: [helpembed] });
    },
};