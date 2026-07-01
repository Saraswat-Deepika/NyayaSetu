const mongoose = require('mongoose');
const Law = require('../models/Law');
const LegalFacility = require('../models/LegalFacility');

const sampleLaws = [
    {
        name: 'Consumer Protection Act 2019',
        description: 'An Act to provide for protection of the interests of consumers and for establishment of authorities for timely and effective administration and settlement of consumers disputes.',
        officialLink: 'https://legislative.gov.in/actsofparliamentfromtheyear/consumer-protection-act-2019',
        keywords: ['consumer', 'complaint', 'defective', 'warranty', 'refund', 'unfair trade', 'service', 'product', 'seller', 'invoice'],
        sections: [
            {
                number: 'Section 2(7)',
                title: 'Definition of Consumer',
                explanation: 'Defines a consumer as any person who buys any goods or hires/avails of any services for a consideration, including offline or online transactions.'
            },
            {
                number: 'Section 35',
                title: 'Manner in which Complaint shall be made',
                explanation: 'Lays down the procedure for filing a consumer complaint to the District Commission against defective goods, deficient service, or overcharging.'
            }
        ]
    },
    {
        name: 'Information Technology Act 2000',
        description: 'Primary law in India dealing with cybercrime and electronic commerce.',
        officialLink: 'https://www.meity.gov.in/content/information-technology-act-2000',
        keywords: ['cyber', 'fraud', 'online', 'hacked', 'data', 'phishing', 'email', 'internet', 'scam', 'unauthorized', 'privacy'],
        sections: [
            {
                number: 'Section 66D',
                title: 'Punishment for Cheating by Personation using Computer Resource',
                explanation: 'Provides punishment for cheating by impersonation using a communication device or computer resource (e.g. fake profiles, phishing links).'
            },
            {
                number: 'Section 43A',
                title: 'Compensation for Failure to Protect Data',
                explanation: 'Mandates corporate compensation for negligence in implementing reasonable security practices, leading to wrongful loss or gain in personal data.'
            }
        ]
    },
    {
        name: 'Bharatiya Nyaya Sanhita 2023',
        description: 'The official penal code of India, replacing the Indian Penal Code (IPC).',
        officialLink: 'https://sansad.in/acts',
        keywords: ['theft', 'cheating', 'fraud', 'robbery', 'assault', 'harassment', 'crime', 'fir', 'police', 'stolen', 'threat'],
        sections: [
            {
                number: 'Section 318',
                title: 'Cheating',
                explanation: 'Defines and provides punishment for cheating, where someone fraudulently induces a person to deliver property or commit a harmful act.'
            },
            {
                number: 'Section 303',
                title: 'Theft',
                explanation: 'Defines theft as dishonestly taking movable property out of the possession of any person without that person\'s consent.'
            }
        ]
    },
    {
        name: 'Protection of Women from Domestic Violence Act 2005',
        description: 'An Act to provide for more effective protection of the rights of women guaranteed under the Constitution who are victims of violence of any kind occurring within the family.',
        officialLink: 'https://wcd.nic.in/act/protection-women-domestic-violence-act-2005',
        keywords: ['domestic', 'violence', 'husband', 'abuse', 'beating', 'marital', 'physical abuse', 'mental abuse', 'in-laws', 'harassed at home'],
        sections: [
            {
                number: 'Section 3',
                title: 'Definition of Domestic Violence',
                explanation: 'Defines domestic violence to include physical, sexual, verbal, emotional, and economic abuse by an adult male member in a domestic relationship.'
            },
            {
                number: 'Section 12',
                title: 'Application to Magistrate',
                explanation: 'Allows an aggrieved woman to file an application before a Magistrate seeking protection orders, residential status, or financial support.'
            }
        ]
    },
    {
        name: 'Transfer of Property Act 1882',
        description: 'An Act containing provisions regarding the transfer of property by act of parties.',
        officialLink: 'https://legislative.gov.in/actsofparliamentfromtheyear/transfer-property-act-1882',
        keywords: ['property', 'landlord', 'tenant', 'rent', 'lease', 'eviction', 'deposit', 'house', 'agreement', 'flat', 'sale'],
        sections: [
            {
                number: 'Section 106',
                title: 'Notice to Terminate Lease of Immovable Property',
                explanation: 'Mandates a minimum notice period (typically 15 days for residential tenancies) by either party to terminate a month-to-month lease agreement.'
            },
            {
                number: 'Section 54',
                title: 'Sale of Immovable Property',
                explanation: 'Defines sale and dictates that transfer of tangible immovable property worth over 100 rupees must be registered by a written instrument.'
            }
        ]
    },
    {
        name: 'Code on Wages 2019',
        description: 'Replaces previous labor regulations including the Payment of Wages Act and Minimum Wages Act.',
        officialLink: 'https://labour.gov.in/wage-board-codes',
        keywords: ['salary', 'wage', 'employer', 'pay', 'bonus', 'overtime', 'earnings', 'workplace', 'non-payment', 'withheld'],
        sections: [
            {
                number: 'Section 17',
                title: 'Time Limit for Payment of Wages',
                explanation: 'Prescribes strict timelines within which an employer must pay wages to an employee (e.g. within 7 days of the wage period expiry).'
            },
            {
                number: 'Section 18',
                title: 'Deductions which may be made from Wages',
                explanation: 'Specifies the only legal and permissible deductions an employer can make from an employee\'s salary, such as taxes or service absences.'
            }
        ]
    },
    {
        name: 'Right to Information Act 2005',
        description: 'An Act to provide for setting out the practical regime of right to information for citizens to secure access to information under the control of public authorities.',
        officialLink: 'https://rti.gov.in/',
        keywords: ['rti', 'information', 'government', 'public authority', 'pio', 'file rti', 'records', 'official documents'],
        sections: [
            {
                number: 'Section 6',
                title: 'Request for obtaining Information',
                explanation: 'Defines how a citizen can make a request to a Public Information Officer (PIO) for government files, data, or documents.'
            },
            {
                number: 'Section 7',
                title: 'Disposal of Request',
                explanation: 'Mandates that the requested information must be supplied or rejected within 30 days of filing the application.'
            }
        ]
    }
];

const sampleFacilities = [
    // Mumbai
    {
        name: 'Mumbai Police Headquarters',
        type: 'Police Station',
        address: 'CST Area, Fort, Mumbai, Maharashtra 400001',
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 18.9436,
        longitude: 72.8360,
        phone: '022-22620826',
        googleMapsUrl: 'https://maps.app.goo.gl/mumbai-police-hq'
    },
    {
        name: 'Bandra Women Police Station',
        type: 'Women Police Station',
        address: 'S.V. Road, Bandra West, Mumbai, Maharashtra 400050',
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 19.0583,
        longitude: 72.8300,
        phone: '022-26422736',
        googleMapsUrl: 'https://maps.app.goo.gl/bandra-women-ps'
    },
    {
        name: 'BKC Cyber Crime Police Station',
        type: 'Cyber Crime Police Station',
        address: 'BKC, Bandra East, Mumbai, Maharashtra 400051',
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 19.0607,
        longitude: 72.8643,
        phone: '022-26504008',
        googleMapsUrl: 'https://maps.app.goo.gl/bkc-cyber-ps'
    },
    {
        name: 'Bombay High Court',
        type: 'High Court',
        address: 'Dr Kane Road, Fort, Mumbai, Maharashtra 400032',
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 18.9304,
        longitude: 72.8312,
        phone: '022-22673062',
        googleMapsUrl: 'https://maps.app.goo.gl/bombay-high-court'
    },
    {
        name: 'City Civil Court Mumbai',
        type: 'District Court',
        address: 'Karmaveer Bhaurao Patil Marg, Fort, Mumbai, Maharashtra 400032',
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 18.9281,
        longitude: 72.8319,
        phone: '022-22676100',
        googleMapsUrl: 'https://maps.app.goo.gl/mumbai-civil-court'
    },
    {
        name: 'Maharashtra State Legal Services Authority',
        type: 'Legal Aid Center',
        address: 'High Court Extension Building, Fort, Mumbai, Maharashtra 400032',
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 18.9312,
        longitude: 72.8300,
        phone: '022-22691666',
        googleMapsUrl: 'https://maps.app.goo.gl/maharashtra-salsa'
    },

    // Delhi
    {
        name: 'Connaught Place Police Station',
        type: 'Police Station',
        address: 'Sansad Marg, Connaught Place, New Delhi, Delhi 110001',
        city: 'Delhi',
        state: 'Delhi',
        latitude: 28.6289,
        longitude: 77.2185,
        phone: '011-23351221',
        googleMapsUrl: 'https://maps.app.goo.gl/cp-police-station'
    },
    {
        name: 'Parliament Street Women Police Station',
        type: 'Women Police Station',
        address: 'Parliament Street, New Delhi, Delhi 110001',
        city: 'Delhi',
        state: 'Delhi',
        latitude: 28.6231,
        longitude: 77.2144,
        phone: '011-23361285',
        googleMapsUrl: 'https://maps.app.goo.gl/parliament-st-women-ps'
    },
    {
        name: 'Dwarka Cyber Police Station',
        type: 'Cyber Crime Police Station',
        address: 'Sector 19, Dwarka, New Delhi, Delhi 110075',
        city: 'Delhi',
        state: 'Delhi',
        latitude: 28.5833,
        longitude: 77.0667,
        phone: '011-28080005',
        googleMapsUrl: 'https://maps.app.goo.gl/dwarka-cyber-ps'
    },
    {
        name: 'High Court of Delhi',
        type: 'High Court',
        address: 'Sher Shah Road, New Delhi, Delhi 110003',
        city: 'Delhi',
        state: 'Delhi',
        latitude: 28.6142,
        longitude: 77.2435,
        phone: '011-41794100',
        googleMapsUrl: 'https://maps.app.goo.gl/delhi-high-court'
    },
    {
        name: 'Tis Hazari District Courts',
        type: 'District Court',
        address: 'Bhartendu Harishchandra Marg, Tis Hazari, Delhi 110054',
        city: 'Delhi',
        state: 'Delhi',
        latitude: 28.6622,
        longitude: 77.2081,
        phone: '011-23950920',
        googleMapsUrl: 'https://maps.app.goo.gl/tis-hazari-courts'
    },
    {
        name: 'Delhi State Legal Services Authority',
        type: 'Legal Aid Center',
        address: 'Patiala House Courts Complex, New Delhi, Delhi 110001',
        city: 'Delhi',
        state: 'Delhi',
        latitude: 28.6256,
        longitude: 77.2289,
        phone: '011-1516',
        googleMapsUrl: 'https://maps.app.goo.gl/delhi-salsa'
    },

    // Bangalore
    {
        name: 'Infantry Road Central Police Station',
        type: 'Police Station',
        address: 'Infantry Rd, Tasker Town, Shivaji Nagar, Bengaluru, Karnataka 560001',
        city: 'Bangalore',
        state: 'Karnataka',
        latitude: 12.9812,
        longitude: 77.5960,
        phone: '080-22942201',
        googleMapsUrl: 'https://maps.app.goo.gl/infantry-road-ps'
    },
    {
        name: 'Bangalore Women Police Station',
        type: 'Women Police Station',
        address: 'Halasuru, Bengaluru, Karnataka 560008',
        city: 'Bangalore',
        state: 'Karnataka',
        latitude: 12.9716,
        longitude: 77.5946,
        phone: '080-22942223',
        googleMapsUrl: 'https://maps.app.goo.gl/blr-women-ps'
    },
    {
        name: 'Bangalore Cyber Crime Police Station',
        type: 'Cyber Crime Police Station',
        address: 'CID Annex Building, Carlton House, Bengaluru, Karnataka 560001',
        city: 'Bangalore',
        state: 'Karnataka',
        latitude: 12.9800,
        longitude: 77.5980,
        phone: '080-22370001',
        googleMapsUrl: 'https://maps.app.goo.gl/blr-cyber-ps'
    },
    {
        name: 'High Court of Karnataka',
        type: 'High Court',
        address: 'Opposite to Vidhana Soudha, Ambedkar Veedhi, Bengaluru, Karnataka 560001',
        city: 'Bangalore',
        state: 'Karnataka',
        latitude: 12.9786,
        longitude: 77.5996,
        phone: '080-22954600',
        googleMapsUrl: 'https://maps.app.goo.gl/karnataka-high-court'
    },
    {
        name: 'City Civil Court Bengaluru',
        type: 'District Court',
        address: 'Kempegowda Road, Gandhinagar, Bengaluru, Karnataka 560009',
        city: 'Bangalore',
        state: 'Karnataka',
        latitude: 12.9734,
        longitude: 77.5815,
        phone: '080-22213123',
        googleMapsUrl: 'https://maps.app.goo.gl/blr-civil-court'
    },
    {
        name: 'Karnataka State Legal Services Authority',
        type: 'Legal Aid Center',
        address: 'Nyayadegula, H. Siddaiah Road, Bengaluru, Karnataka 560027',
        city: 'Bangalore',
        state: 'Karnataka',
        latitude: 12.9790,
        longitude: 77.5910,
        phone: '080-22111718',
        googleMapsUrl: 'https://maps.app.goo.gl/karnataka-salsa'
    }
];

const seedDB = async () => {
    try {
        const lawsCount = await Law.countDocuments({});
        if (lawsCount === 0) {
            await Law.insertMany(sampleLaws);
            console.log('✅ Indian Laws seeded successfully.');
        } else {
            console.log('ℹ️ Indian Laws collection already populated.');
        }

        const facilitiesCount = await LegalFacility.countDocuments({});
        if (facilitiesCount === 0) {
            await LegalFacility.insertMany(sampleFacilities);
            console.log('✅ Legal Facilities seeded successfully.');
        } else {
            console.log('ℹ️ Legal Facilities collection already populated.');
        }
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    }
};

module.exports = seedDB;
