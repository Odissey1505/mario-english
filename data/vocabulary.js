/* Built-in vocabulary bank. Word format: "english|emoji|short definition" (the last two are optional).
   Tiers: [0] easy, [1] medium, [2] hard. Add a topic and it appears in the topic picker by itself. */
const WORDBANK = {
  animals:{n:'Animals',lv:[
    ['cat|🐱','dog|🐶','bird|🐦','fish|🐟','horse|🐴','cow|🐮','pig|🐷','rabbit|🐰'],
    ['fox|🦊','wolf|🐺','deer|🦌','squirrel|🐿️','hedgehog|🦔','dolphin|🐬','octopus|🐙','parrot|🦜'],
    ['predator||an animal that hunts and eats other animals','prey||an animal that is hunted for food','mammal||a warm-blooded animal that feeds its babies milk','reptile||a cold-blooded animal with scales, like a snake','habitat||the natural place where an animal or plant lives','endangered||in danger of disappearing forever','species||a group of very similar living things','herd||a large group of animals living together']]},
  food:{n:'Food',lv:[
    ['bread|🍞','cheese|🧀','apple|🍎','milk|🥛','egg|🥚','soup|🍲','rice|🍚','cake|🍰'],
    ['pumpkin|🎃','strawberry|🍓','sausage|🌭','pancake|🥞','honey|🍯','cucumber|🥒','flour','dessert|🍮'],
    ['ingredient||one of the things you use to make a dish','nutritious||full of things that keep your body healthy','flavour||the taste of something','recipe||instructions for cooking a dish','tasteless||having no taste at all','leftovers||food that was not eaten at a meal','seasoning||salt, pepper or herbs added to food','starving||extremely hungry']]},
  colors:{n:'Colors',lv:[
    ['red|🔴','blue|🔵','green|🟢','yellow|🟡','black|⚫','white|⚪','brown|🟤','pink|🌸'],
    ['purple|🟣','orange|🟠','grey','golden|🥇','silver|🥈','dark|🌑','bright|🔆','light|💡'],
    ['pale||very light, with little colour','shade||a slightly darker or lighter form of a colour','colourful||having many bright colours','faded||less bright than before, after time or sunlight','vivid||very strong and bright','transparent||you can see through it','glowing||giving out a soft light','dull||not bright and not interesting']]},
  family:{n:'Family',lv:[
    ['mother|👩','father|👨','sister|👧','brother|👦','baby|👶','grandma|👵','grandpa|👴','son'],
    ['daughter','cousin','aunt','uncle','parents','twins|👯','nephew','niece'],
    ['relative||a member of your family','ancestor||a family member who lived long ago','sibling||your brother or sister','household||all the people living in one home','upbringing||the way parents raise a child','in-laws||the family of your husband or wife','guardian||an adult legally responsible for a child','heir||the person who will get the family money or title']]},
  school:{n:'School',lv:[
    ['book|📕','pen|🖊️','pencil|✏️','desk','bag|🎒','ruler|📏','teacher|👩‍🏫','board'],
    ['homework','subject','timetable','break','uniform','exam|📝','mark','library|📚'],
    ['assignment||a piece of work a teacher gives you','deadline||the last day you can hand something in','revision||studying again before a test','curriculum||all the subjects a school teaches','attendance||how often a student comes to class','peer||a student of the same age as you','achievement||something good you have managed to do','tutor||a teacher who works with one student']]},
  clothes:{n:'Clothes',lv:[
    ['hat|🎩','shoes|👟','shirt|👕','dress|👗','socks|🧦','coat|🧥','skirt','jeans|👖'],
    ['gloves|🧤','scarf|🧣','boots|🥾','jacket','belt','pocket','sleeve','trainers'],
    ['outfit||a whole set of clothes worn together','fabric||the material clothes are made of','fashionable||popular and modern in style','baggy||much too loose and wide','tight||too close to the body','wardrobe||all the clothes a person owns','casual||relaxed, not for special occasions','formal||smart clothes for official occasions']]},
  house:{n:'House',lv:[
    ['door|🚪','window|🪟','table','chair|🪑','bed|🛏️','lamp|💡','key|🔑','floor'],
    ['kitchen','bathroom|🛁','ceiling','stairs','fridge','carpet','mirror|🪞','shelf'],
    ['furniture||tables, chairs, beds and similar things','cosy||warm and comfortable','tidy||clean and in good order','rent||money you pay every month to live somewhere','neighbourhood||the area around your home','appliance||a machine used at home, like a fridge','spacious||with a lot of room inside','basement||a room under the ground floor']]},
  weather:{n:'Weather',lv:[
    ['sun|☀️','rain|🌧️','snow|❄️','wind|💨','cloud|☁️','hot|🔥','cold|🥶','warm'],
    ['storm|⛈️','fog|🌫️','thunder','lightning|⚡','rainbow|🌈','freezing','shower','breeze'],
    ['drought||a long time with no rain','humidity||the amount of water in the air','forecast||a report of what the weather will be','severe||very bad and dangerous','climate||the usual weather of a place over many years','flood||a lot of water covering the land','melt||to turn from ice into water','frost||thin white ice on the ground in the morning']]},
  transport:{n:'Transport',lv:[
    ['car|🚗','bus|🚌','bike|🚲','train|🚆','plane|✈️','boat|⛵','ship|🚢','taxi|🚕'],
    ['helicopter|🚁','tram|🚊','underground','ticket|🎫','driver','platform','journey','traffic'],
    ['commute||to travel to work every day','vehicle||any machine that carries people, like a car or bus','fare||the money you pay for a journey','delayed||later than the planned time','route||the way from one place to another','pedestrian||a person walking in the street','fuel||petrol or diesel that makes an engine work','congestion||too many cars, so nothing moves']]},
  body:{n:'Body',lv:[
    ['head','hand|✋','leg|🦵','eye|👁️','ear|👂','nose|👃','mouth|👄','hair'],
    ['shoulder','knee','finger','tooth|🦷','stomach','neck','elbow','heart|❤️'],
    ['muscle||the part of the body that makes you strong','bone||a hard white part inside the body','breathe||to take air in and out','injury||damage to your body in an accident','ache||a pain that continues for a long time','recover||to get well after being ill','swollen||bigger than normal because of an injury','treatment||what a doctor does to make you well']]},
  jobs:{n:'Jobs',lv:[
    ['doctor|👨‍⚕️','cook|👨‍🍳','farmer|👨‍🌾','pilot|👨‍✈️','singer|🎤','artist|🎨','driver','nurse'],
    ['engineer','lawyer','journalist','scientist|🔬','plumber','accountant','translator','firefighter|🚒'],
    ['employer||the person or company you work for','salary||the money you get for your job every month','promotion||moving to a better position at work','apply for||to ask officially for a job','experience||the skills you get from working','shift||a period of working hours, like nights','freelance||working for yourself for different clients','retire||to stop working at the end of your career']]},
  sports:{n:'Sports',lv:[
    ['ball|⚽','run|🏃','swim|🏊','jump','team','game','win|🏆','play'],
    ['coach','match','score','training','goal','referee','defeat','champion'],
    ['endurance||the ability to keep going for a long time','opponent||the player you are playing against','tournament||a competition with many matches','injury time||extra minutes added at the end of a match','tactics||the plan a team uses to win','substitute||a player who comes on for another','draw||a result where nobody wins','warm up||to do light exercise before playing']]},
  feelings:{n:'Feelings',lv:[
    ['happy|😀','sad|😢','angry|😠','tired|😴','scared|😨','glad','hungry','bored'],
    ['nervous','proud','jealous','confused','excited','lonely','relaxed','surprised|😲'],
    ['anxious||worried that something bad may happen','delighted||very happy and pleased','frustrated||annoyed because you cannot do something','grateful||thankful for what someone did','overwhelmed||feeling that everything is too much','reluctant||not wanting to do something','content||quietly happy with what you have','furious||extremely angry']]},
  travel:{n:'Travel',lv:[
    ['map|🗺️','hotel|🏨','beach|🏖️','camp|⛺','bag','trip','sea|🌊','city|🏙️'],
    ['luggage|🧳','passport','suitcase','booking','flight','sightseeing','guide','abroad'],
    ['itinerary||a plan of your journey day by day','accommodation||a place where travellers stay','departure||the moment a plane or train leaves','destination||the place you are travelling to','check in||to register at a hotel or airport','delay||when something starts later than planned','insurance||money you pay in case something goes wrong','currency||the money used in a country']]},
  technology:{n:'Technology',lv:[
    ['phone|📱','computer|💻','screen','game|🎮','camera|📷','robot|🤖','mouse|🖱️','video'],
    ['keyboard|⌨️','battery|🔋','password','download','update','device','network','charger'],
    ['artificial intelligence||computer systems that learn and decide','software||the programs a computer runs','data||information stored on a computer','encryption||turning information into a secret code','crash||when a program stops working suddenly','back up||to make a second copy of your files','wireless||working without cables','glitch||a small fault that stops something working']]},
  nature:{n:'Nature',lv:[
    ['tree|🌳','flower|🌸','river','stone|🪨','forest|🌲','grass','mountain|⛰️','leaf|🍃'],
    ['valley','island|🏝️','cave','waterfall','soil','branch','desert|🏜️','swamp'],
    ['ecosystem||all the living things in one area together','pollution||dirty air, water or land','preserve||to keep something safe from harm','wildlife||wild animals and plants','renewable||energy that never runs out, like wind','erosion||when wind or water slowly wears land away','extinct||no longer existing anywhere','landscape||the way an area of land looks']]}
};
