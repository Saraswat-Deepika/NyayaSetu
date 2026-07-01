/**
 * Emergency topics and keyword list for Indian helpline mapping.
 * Made comprehensive to match variations (e.g. beats, beat, abuse, scam).
 */
const EMERGENCY_TOPICS = [
    {
        name: 'Domestic Violence',
        keywords: [
            'domestic violence', 'beat my wife', 'beating me', 'beats me', 'beat me', 
            'husband abuse', 'domestic abuse', 'violence at home', 'marital violence', 
            'wife beating', 'abusing me', 'husband beats', 'abuse at home'
        ]
    },
    {
        name: 'Sexual Harassment',
        keywords: [
            'sexual harassment', 'harassment', 'harassed', 'harassing', 'molest', 
            'molested', 'molesting', 'eve teasing', 'stalking', 'stalked', 'stalker', 
            'sexual abuse', 'rape', 'raped', 'sexual assault', 'abuse at work'
        ]
    },
    {
        name: 'Child Abuse',
        keywords: [
            'child abuse', 'child labor', 'pedophile', 'abuse child', 'child trafficking', 
            'minor abuse', 'pocso'
        ]
    },
    {
        name: 'Human Trafficking',
        keywords: [
            'human trafficking', 'trafficking', 'forced labor', 'kidnap for ransom', 
            'selling girls', 'smuggling people'
        ]
    },
    {
        name: 'Cyber Fraud / Financial Scam',
        keywords: [
            'cyber fraud', 'financial scam', 'bank fraud', 'online fraud', 'upi scam', 
            'phishing scam', 'card fraud', 'money stolen online', 'credit card scam', 
            'scammed', 'scam', 'defrauded', 'stole my money', 'hacked'
        ]
    },
    {
        name: 'Missing Person',
        keywords: [
            'missing person', 'lost child', 'missing husband', 'missing wife', 
            'missing family', 'kidnapped', 'runaway'
        ]
    },
    {
        name: 'Suicide Threat',
        keywords: [
            'suicide', 'kill myself', 'end my life', 'want to die', 'suicidal', 
            'ending life', 'kill me'
        ]
    },
    {
        name: 'Life Threat / Kidnapping / Acid Attack',
        keywords: [
            'life threat', 'threaten to kill', 'threatened to kill', 'kidnapping', 
            'kidnapped', 'acid attack', 'hostage', 'abduction', 'ransom', 'threaten'
        ]
    }
];

/**
 * Checks a given query text for emergency signals.
 */
const checkEmergency = (text) => {
    if (!text) return { isEmergency: false, matchedTopic: null };

    const lowerText = text.toLowerCase();
    for (const topic of EMERGENCY_TOPICS) {
        for (const keyword of topic.keywords) {
            if (lowerText.includes(keyword)) {
                return {
                    isEmergency: true,
                    matchedTopic: topic.name,
                    helplines: [
                        { name: 'National Emergency / Police', number: '112' },
                        { name: 'Women Helpline', number: '181' },
                        { name: 'Cyber Crime Helpline', number: '1930' },
                        { name: 'Childline', number: '1098' }
                    ],
                    portals: [
                        { name: 'Cyber Crime Portal', url: 'https://cybercrime.gov.in' },
                        { name: 'Women Helpline Portal', url: 'http://www.ncwhelpline.in' }
                    ]
                };
            }
        }
    }

    return { isEmergency: false, matchedTopic: null };
};

module.exports = { checkEmergency };
