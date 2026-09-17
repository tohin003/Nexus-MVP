import type { AppState } from '../repo/db';
import type {
  User, Intent, Circle, Post, Connection, ConnectionRequest, Conversation,
  Message, Notification, CircleEvent, CircleProject,
} from '../domain/types';

/** Fictional demo data. Names, biographies, work and reputation are illustrative,
 * not the identities or achievements of the people in the placeholder portraits.
 * Portraits are bundled locally; see ASSETS.md. No network access is needed. */
const NOW = Date.now();
const DAY = 86_400_000;
const HOUR = 3_600_000;
const ago = (days: number) => NOW - days * DAY;
const ahead = (days: number) => NOW + days * DAY;

function profile(data: Pick<User, 'id' | 'name' | 'headline' | 'city' | 'roles' | 'bio' | 'currently' | 'interests' | 'skills' | 'needs'> & Partial<User>): User {
  return {
    username: data.id === 'me' ? 'prince.creates' : `${data.id}.nexus`,
    avatar: `/avatars/${data.id === 'me' ? 'prince' : data.id}.jpg`,
    accentHue: 260,
    availability: 'evenings',
    experience: 'intermediate',
    // Demo-only convenience so the moderation workspace is explorable; this flag
    // is browser-local and must never be treated as production authorization.
    isAdmin: data.id === 'me',
    reputation: { helpfulness: 88, reliability: 90, meaningfulConnections: 8, peopleHelped: 12, projectsCompleted: 3, collaborations: 4 },
    trustBadges: ['community'],
    privacy: { discoverable: true, whoCanMessage: 'connections-only', showCity: true, showInLocalSuggestions: true },
    joinedAt: ago(40),
    ...data,
    bio: `${data.bio} · Fictional demo profile.`,
  };
}

export const seedUsers: User[] = [
  profile({
    id: 'me', name: 'Prince', headline: 'Creator · Storyteller · Building in public', city: 'Jaipur',
    roles: ['creator', 'student'], isDemoUser: true, accentHue: 266,
    bio: 'I turn everyday questions into stories worth sharing. Starting a filmmaking YouTube channel, one imperfect video at a time.',
    currently: 'Starting a filmmaking channel — looking for an editing partner.',
    interests: ['youtube', 'filmmaking', 'horror', 'writing', 'marketing'],
    skills: ['storytelling', 'content-marketing-skill', 'social-media-growth'],
    needs: ['video-editing', 'premiere-pro'], availability: 'weekends',
    reputation: { helpfulness: 86, reliability: 91, meaningfulConnections: 2, peopleHelped: 5, projectsCompleted: 2, collaborations: 2 },
    trustBadges: [],
  }),
  profile({
    id: 'aarav', name: 'Aarav Mehta', headline: 'Video Editor · Filmmaker', city: 'Jaipur',
    roles: ['creator', 'freelancer'], accentHue: 32, availability: 'weekends', experience: 'experienced',
    bio: 'I make cuts you feel, not just see. Premiere Pro, sound-led edits and a soft spot for low-budget horror.',
    currently: 'Looking for a storyteller to launch a filmmaking YouTube series together.',
    interests: ['youtube', 'filmmaking', 'horror', 'editing', 'writing', 'marketing'],
    skills: ['video-editing', 'premiere-pro', 'video-shooting'],
    needs: ['storytelling', 'content-marketing-skill', 'social-media-growth'],
    reputation: { helpfulness: 96, reliability: 94, meaningfulConnections: 27, peopleHelped: 38, projectsCompleted: 12, collaborations: 9 },
    trustBadges: ['skill', 'community', 'collaborations'],
  }),
  profile({
    id: 'meera', name: 'Meera Sanyal', headline: 'Writer · Indie Filmmaker', city: 'Jaipur',
    roles: ['artist', 'creator'], accentHue: 350, availability: 'weekends',
    bio: 'Writing small stories with unsettling endings. I believe a good short film starts with a conversation, not a camera.',
    currently: 'Finding a tiny crew for a five-minute horror short, The Last Light.',
    interests: ['filmmaking', 'horror', 'screenwriting', 'writing', 'movies'],
    skills: ['screenwriting', 'storytelling'], needs: ['cinematography-skill', 'video-editing'],
  }),
  profile({
    id: 'kabir', name: 'Kabir Khan', headline: 'Photographer · Chasing the everyday', city: 'Jaipur',
    roles: ['freelancer', 'creator'], accentHue: 173, availability: 'weekends',
    bio: 'Street corners, chai stalls and people being themselves. Happy to help you feel less awkward in front of a camera.',
    currently: 'Putting together a weekend photo walk and a twelve-frame city story.',
    interests: ['photography', 'street-photo', 'portrait', 'travel', 'filmmaking'],
    skills: ['photography-skill', 'cinematography-skill'], needs: ['storytelling', 'graphic-design'],
    reputation: { helpfulness: 94, reliability: 93, meaningfulConnections: 18, peopleHelped: 24, projectsCompleted: 8, collaborations: 7 },
  }),
  profile({
    id: 'ananya', name: 'Ananya Rao', headline: 'Product Designer · Thoughtful interfaces', city: 'Bengaluru',
    roles: ['designer', 'professional'], accentHue: 305,
    bio: 'Designing useful things for the people usually left out of the brief. Figma, accessibility and honest critique.',
    currently: 'Prototyping a calmer habit tracker with a small builder team.',
    interests: ['design', 'ui-design', 'startups', 'art'],
    skills: ['ui-design-skill', 'graphic-design', 'logo-design'], needs: ['web-development', 'content-marketing-skill'],
  }),
  profile({
    id: 'rohan', name: 'Rohan Iyer', headline: 'Developer · Shipping small useful apps', city: 'Bengaluru',
    roles: ['developer', 'student'], accentHue: 218,
    bio: 'Final-year CS student learning by shipping. I care about clean interfaces and documentation someone can actually follow.',
    currently: 'Building an open-source study planner in thirty days.',
    interests: ['coding', 'web-dev', 'ai', 'startups'],
    skills: ['web-development', 'python-skill'], needs: ['ui-design-skill', 'content-marketing-skill'],
  }),
  profile({
    id: 'isha', name: 'Isha Patel', headline: 'Brand Designer · A little colour, a lot of intent', city: 'Ahmedabad',
    roles: ['designer', 'freelancer'], accentHue: 25, availability: 'flexible',
    bio: 'Making independent brands feel like themselves. Currently experimenting with hand-lettered thumbnails and bold type.',
    currently: 'Trading a thumbnail refresh for feedback on my portfolio story.',
    interests: ['design', 'branding', 'art', 'youtube'],
    skills: ['thumbnail-design', 'logo-design', 'graphic-design'], needs: ['storytelling', 'web-development'],
  }),
  profile({
    id: 'zoya', name: 'Zoya Mir', headline: 'Documentary Filmmaker · Listening first', city: 'Delhi',
    roles: ['creator', 'artist'], accentHue: 162, experience: 'experienced', availability: 'flexible',
    bio: 'Documenting the craft and care behind ordinary work. Always ask permission before recording; always share the final cut.',
    currently: 'Editing a three-part mini-documentary on neighbourhood makers.',
    interests: ['filmmaking', 'directing', 'cinematography', 'photography'],
    skills: ['cinematography-skill', 'video-shooting', 'storytelling'], needs: ['music-production-skill', 'video-editing'],
  }),
  profile({
    id: 'dev', name: 'Dev Menon', headline: 'Android Developer · Offline-first believer', city: 'Kochi',
    roles: ['developer', 'freelancer'], accentHue: 200,
    bio: 'Building lightweight Android apps that still work on a patchy connection. Learning to explain technical ideas without jargon.',
    currently: 'Looking for an educator to test an offline revision app.',
    interests: ['coding', 'mobile-dev', 'teaching', 'startups'],
    skills: ['android-development', 'web-development'], needs: ['chemistry-skill', 'ui-design-skill'],
  }),
  profile({
    id: 'sana', name: 'Sana Sheikh', headline: 'Chemistry Educator · Making the hard bits click', city: 'Pune',
    roles: ['educator', 'creator'], accentHue: 282, experience: 'experienced',
    bio: 'I teach chemistry through everyday examples. Building a friendly revision space for adult learners, not another pressure cooker.',
    currently: 'Making ten clear physical-chemistry explainers with a study circle.',
    interests: ['chemistry', 'teaching', 'youtube'],
    skills: ['chemistry-skill', 'math-teaching', 'public-speaking'], needs: ['video-editing', 'thumbnail-design'],
  }),
  profile({
    id: 'arjun', name: 'Arjun Nair', headline: 'Fitness Coach · Consistency over intensity', city: 'Mumbai',
    roles: ['professional', 'creator'], accentHue: 98, availability: 'mornings',
    bio: 'Helping beginners build a movement habit without comparison. Comfortable pace, rest days and showing up count.',
    currently: 'Hosting a thirty-day walk-and-strength accountability circle.',
    interests: ['fitness', 'running', 'gym', 'food'],
    skills: ['fitness-coaching', 'yoga'], needs: ['video-shooting', 'content-marketing-skill'],
  }),
  profile({
    id: 'tara', name: 'Tara Das', headline: 'Indie Musician · Bedroom recordings', city: 'Kolkata',
    roles: ['artist', 'student'], accentHue: 332,
    bio: 'Guitar, voice notes and songs about taking the long way home. Looking for people who enjoy making things before they feel ready.',
    currently: 'Recording a three-song acoustic EP with first-time collaborators.',
    interests: ['music', 'guitar', 'writing'],
    skills: ['guitar-playing', 'singing'], needs: ['music-production-skill', 'photography-skill'],
  }),
  profile({
    id: 'neil', name: 'Neil Dsouza', headline: 'Game Developer · Tiny games, big feelings', city: 'Goa',
    roles: ['developer', 'artist'], accentHue: 249,
    bio: 'Prototyping cosy games after work. My current challenge is finishing one small thing instead of starting five ambitious ones.',
    currently: 'Making a playable two-minute game for a weekend jam.',
    interests: ['gaming', 'game-dev', 'coding', 'art'],
    skills: ['game-dev-skill', 'python-skill'], needs: ['music-production-skill', 'graphic-design'],
  }),
  profile({
    id: 'simran', name: 'Simran Kaur', headline: 'Student Creator · Learning out loud', city: 'Chandigarh',
    roles: ['student', 'creator'], accentHue: 43, experience: 'beginner',
    bio: 'Economics student documenting campus life and the things I wish I had known in first year. Big fan of generous feedback.',
    currently: 'Publishing my first four useful student-budget videos.',
    interests: ['youtube', 'finance', 'content-marketing', 'writing'],
    skills: ['storytelling', 'social-media-growth'], needs: ['video-editing', 'thumbnail-design'],
  }),
  profile({
    id: 'aditya', name: 'Aditya Kulkarni', headline: 'AI Builder · Useful beats flashy', city: 'Pune',
    roles: ['developer', 'founder'], accentHue: 189,
    bio: 'Exploring small AI tools with clear limits and human control. I like test cases, user interviews and sensible scope.',
    currently: 'Building a study-note organiser with transparent source links.',
    interests: ['ai', 'llms', 'ai-agents', 'coding', 'startups'],
    skills: ['llm-apps', 'python-skill', 'web-development'], needs: ['ui-design-skill', 'pitch-decks'],
  }),
  profile({
    id: 'naina', name: 'Naina Verma', headline: 'Photographer · Portraits with personality', city: 'Delhi',
    roles: ['creator', 'freelancer'], accentHue: 18, availability: 'weekends',
    bio: 'Natural-light portraits for people who say they are not photogenic. Learning to pair pictures with short personal essays.',
    currently: 'Making a portrait series about people starting over.',
    interests: ['photography', 'portrait', 'writing', 'art'],
    skills: ['photography-skill', 'video-shooting'], needs: ['storytelling', 'seo'],
  }),
  profile({
    id: 'yusuf', name: 'Yusuf Ali', headline: 'Music Producer · Sound for stories', city: 'Hyderabad',
    roles: ['artist', 'freelancer'], accentHue: 275,
    bio: 'Building warm textures from field recordings and simple melodies. Open to scoring shorts with a small, thoughtful crew.',
    currently: 'Looking for a short film to score and a singer to record with.',
    interests: ['music', 'music-production', 'filmmaking', 'horror'],
    skills: ['music-production-skill', 'guitar-playing'], needs: ['singing', 'video-shooting'],
  }),
  profile({
    id: 'pema', name: 'Pema Bhutia', headline: 'Travel Creator · Slower stories', city: 'Gangtok',
    roles: ['creator', 'explorer'], accentHue: 148, availability: 'flexible',
    bio: 'Sharing respectful travel stories, local food and walks with no checklist. Learning how to make longer videos feel personal.',
    currently: 'Turning a neighbourhood food diary into a short video essay.',
    interests: ['travel', 'food', 'youtube', 'video-essays', 'photography'],
    skills: ['video-shooting', 'cooking', 'storytelling'], needs: ['video-editing', 'music-production-skill'],
  }),
  profile({
    id: 'kavya', name: 'Kavya Reddy', headline: 'Language Mentor · Room to find your voice', city: 'Hyderabad',
    roles: ['educator', 'student'], accentHue: 358,
    bio: 'Running low-pressure spoken-English practice for adult learners. Mistakes welcome; corrections only when you ask.',
    currently: 'Creating a fourteen-day speaking practice group with daily prompts.',
    interests: ['languages', 'english-speaking', 'teaching', 'books'],
    skills: ['english-speaking', 'public-speaking'], needs: ['graphic-design', 'android-development'],
  }),
  profile({
    id: 'aman', name: 'Aman Bansal', headline: 'Gamer · Friendly squads, no toxicity', city: 'Jaipur',
    roles: ['student', 'creator'], accentHue: 227, availability: 'weekends',
    bio: 'Casual co-op, game design rabbit holes and clips that make friends laugh. Looking for a regular, welcoming weekend squad.',
    currently: 'Making a short beginner guide and finding kind gaming teammates.',
    interests: ['gaming', 'esports', 'game-dev', 'youtube'],
    skills: ['video-editing', 'thumbnail-design'], needs: ['game-dev-skill', 'public-speaking'],
    experience: 'beginner',
  }),
  profile({
    id: 'ritika', name: 'Ritika Sen', headline: 'Founder · Sustainable ideas, small experiments', city: 'Mumbai',
    roles: ['founder', 'designer'], accentHue: 72,
    bio: 'Testing a repair-first clothing idea with a tiny student team. Interested in thoughtful brands and honest customer conversations.',
    currently: 'Launching a simple landing page and talking to ten potential users.',
    interests: ['entrepreneurship', 'ecommerce', 'design', 'startups'],
    skills: ['business-strategy', 'pitch-decks', 'ecommerce-skill'], needs: ['web-development', 'photography-skill'],
  }),
];

// Every profile has a current, editable intent, preserving the original language.
export const seedIntents: Intent[] = seedUsers.map((user, index) => ({
  id: `intent-${user.id}`,
  userId: user.id,
  originalText: user.id === 'me'
    ? 'I want to start a filmmaking YouTube channel in Jaipur. I can offer storytelling and marketing, but need a video editor who wants to make horror shorts together.'
    : user.currently,
  title: user.id === 'me' ? 'Build a filmmaking YouTube channel' : user.currently.replace(/\.$/, ''),
  details: user.id === 'aarav'
    ? 'Let’s make a three-video pilot. I can handle editing and Premiere Pro; you bring the story and help us reach the right audience. Weekends in Jaipur or remote. Skill exchange, not a paid job.'
    : 'A fictional demo opportunity. Start with a small shared milestone, agree on expectations, and see whether you enjoy working together.',
  interpretation: {
    intentType: user.id === 'me' ? 'build' : ['arjun', 'kavya'].includes(user.id) ? 'improve-self' : user.id === 'aman' ? 'meet-people' : 'find-collaborator',
    domain: user.interests[0],
    goal: user.id === 'me' ? 'Start a filmmaking YouTube channel' : user.currently.replace(/\.$/, ''),
    skillsNeeded: [...user.needs], skillsOffered: [...user.skills],
    relationship: user.id === 'aman' ? 'friendship' : user.id === 'arjun' ? 'activity' : 'collaboration',
    location: user.city, remoteAllowed: user.id !== 'arjun', experience: 'any',
    compensation: 'free', time: user.availability,
    genre: user.interests.includes('horror') ? 'horror' : null,
    keywords: [...user.interests],
  },
  status: 'active', createdAt: ago(1 + index / 6), expiresAt: ahead(30),
  visibility: 'public', interestedCount: index === 0 ? 2 : 1 + index % 5,
  interestedByMe: false,
}));

function circle(data: Omit<Circle, 'startDate' | 'endDate' | 'dayNumber' | 'createdAt'>, duration = 30, elapsed = 8): Circle {
  return { ...data, startDate: ago(elapsed), endDate: ahead(duration - elapsed), dayNumber: elapsed + 1, createdAt: ago(elapsed + 3) };
}

export const seedCircles: Circle[] = [
  circle({ id: 'jaipur-filmmakers', name: 'Jaipur Indie Filmmakers', emoji: '🎬', category: 'Creative', ownerUserId: 'meera',
    description: 'Small crews. Real stories. A place to make your first film, not just talk about it.',
    purpose: 'Help local storytellers turn a script into a finished short film.', goal: 'Make three short films in 30 days',
    memberIds: ['me', 'meera', 'aarav', 'kabir', 'zoya', 'yusuf'], memberLimit: 12, privacy: 'open', city: 'Jaipur' }),
  circle({ id: 'youtube-lab', name: 'YouTube, From Zero', emoji: '▶️', category: 'Creative', ownerUserId: 'simran',
    description: 'A gentle publishing sprint for creators who are ready to press upload.',
    purpose: 'Trade practical feedback and publish instead of polishing forever.', goal: 'Each publish a three-video pilot in 21 days',
    memberIds: ['me', 'simran', 'aarav', 'isha', 'sana', 'pema', 'aman'], memberLimit: 10, privacy: 'open', city: null }, 21, 5),
  circle({ id: 'build-in-public', name: 'Ship Something Small', emoji: '🛠️', category: 'Tech', ownerUserId: 'rohan',
    description: 'Developers, designers and first-time founders building one useful thing.',
    purpose: 'Pair complementary skills to test a working MVP with real feedback.', goal: 'Ship three usable prototypes in 30 days',
    memberIds: ['rohan', 'ananya', 'dev', 'aditya', 'ritika', 'neil'], memberLimit: 12, privacy: 'open', city: null }, 30, 12),
  circle({ id: 'photo-walks', name: 'Twelve Frames of Jaipur', emoji: '📷', category: 'Creative', ownerUserId: 'kabir',
    description: 'Phones welcome. We notice the city, ask permission, and share what we learn.',
    purpose: 'Meet other photographers and finish a small visual story together.', goal: 'Curate a twelve-photo city zine in 14 days',
    memberIds: ['kabir', 'me', 'naina', 'pema', 'meera'], memberLimit: 8, privacy: 'open', city: 'Jaipur' }, 14, 3),
  circle({ id: 'design-sprint', name: 'Design for Real People', emoji: '✳️', category: 'Creative', ownerUserId: 'ananya',
    description: 'Small critiques, accessible interfaces and feedback you can actually use.',
    purpose: 'Practice inclusive design by solving one everyday problem.', goal: 'Test four accessible prototypes in 14 days',
    memberIds: ['ananya', 'isha', 'ritika', 'rohan', 'kavya'], memberLimit: 10, privacy: 'invite', city: null }, 14, 4),
  circle({ id: 'move-together', name: 'Small Steps, Together', emoji: '🌱', category: 'Life', ownerUserId: 'arjun',
    description: 'A movement habit at your own pace. No body comparisons or public leaderboards.',
    purpose: 'Make showing up for a little movement feel easier with friends.', goal: 'Complete 20 personal movement check-ins in 30 days',
    memberIds: ['arjun', 'ritika', 'simran', 'naina'], memberLimit: 15, privacy: 'open', city: null }, 30, 9),
  circle({ id: 'bedroom-sessions', name: 'The Bedroom Sessions', emoji: '🎸', category: 'Creative', ownerUserId: 'tara',
    description: 'Songwriters, singers and producers making something wonderfully imperfect.',
    purpose: 'Find musical collaborators and finish songs rather than collect demos.', goal: 'Record a three-track community EP in 28 days',
    memberIds: ['tara', 'yusuf', 'neil', 'zoya'], memberLimit: 8, privacy: 'open', city: null }, 28, 6),
  circle({ id: 'study-circle', name: 'Learn It, Explain It', emoji: '📚', category: 'Learning', ownerUserId: 'sana',
    description: 'Adult learners and educators helping each other find clearer explanations.',
    purpose: 'Learn through short teach-backs and supportive peer feedback.', goal: 'Create ten clear chemistry explainers in 30 days',
    memberIds: ['sana', 'dev', 'kavya', 'simran', 'aditya'], memberLimit: 12, privacy: 'open', city: null }, 30, 7),
];

function post(userId: string, kind: Post['kind'], title: string, body: string, circleId: string | null, tags: string[], index: number, structured?: Post['structured']): Post {
  return {
    id: `post-${userId}`, userId, kind, title, body, circleId, tags,
    createdAt: NOW - (index + 1) * HOUR, structured,
    reactions: { useful: 2 + index % 7, interesting: 1 + index % 5, 'lets-do-it': index % 3, support: 3 + index % 4 },
    myReaction: null, comments: [], helpedBy: [], iCanHelp: false,
  };
}

// Exactly 20 posts: one from each of Prince's 20 peers. Prince's own sample
// content is his intent plus authored comments below (21 profiles / 20 posts).
export const seedPosts: Post[] = [
  post('aarav', 'collaborate', 'You bring the story. I’ll bring the edit.',
    'I have room for one creative collaboration this month. Looking for a storyteller making thoughtful YouTube videos or a tiny horror short. Let’s try a 60-second pilot first — no pressure to commit to a series.',
    'youtube-lab', ['youtube', 'filmmaking', 'editing'], 0,
    { skillsNeeded: ['storytelling', 'content-marketing-skill'], location: 'Jaipur', time: 'Weekends', paid: false }),
  post('meera', 'ask', 'Can a horror film work with no jump scares?',
    'Draft three of The Last Light is finally ready. One room, two characters, a power cut. I’m trying to build tension through what we don’t see. What is your favourite example of quiet horror?',
    'jaipur-filmmakers', ['horror', 'screenwriting', 'filmmaking'], 1),
  post('kabir', 'meet', 'A camera, a chai, and a different way to see Jaipur',
    'Our next photo walk is about overlooked details: hand-painted signs, interesting shadows, little acts of kindness. Phones are absolutely welcome. We’ll meet in a public café, keep the group small, and ask before photographing people.',
    'photo-walks', ['photography', 'street-photo'], 2,
    { skillsNeeded: [], location: 'Jaipur · public café', time: 'This weekend, morning', paid: false }),
  post('ananya', 'share', 'The best feedback was “I don’t understand this button.”',
    'Three quick tests changed our habit tracker more than a week of polishing. We removed two steps, rewrote the empty state, and made keyboard focus visible. Reminder to myself: design with people, not assumptions.',
    'design-sprint', ['design', 'ui-design'], 3),
  post('rohan', 'collaborate', 'A study planner that works when the Wi-Fi doesn’t',
    'The first local-first prototype is ready. Looking for a designer to help simplify the weekly view. I can trade front-end implementation or a patient introduction to React. Two short sessions this week?',
    'build-in-public', ['coding', 'web-dev', 'startups'], 4,
    { skillsNeeded: ['ui-design-skill'], location: null, time: 'Two weekday evenings', paid: false }),
  post('isha', 'teach', 'A thumbnail should make one promise, not five',
    'My tiny checklist: one focal point, readable at phone size, and a title-image pair that adds context rather than repeats it. Happy to give constructive feedback on three thumbnails this week.',
    'youtube-lab', ['design', 'branding', 'youtube'], 5),
  post('zoya', 'share', 'The most important thing on set was a conversation',
    'Before filming our neighbourhood tailor, we put the camera away and talked for an hour. She chose what she wanted to share and reviewed the rough cut. The story became better when we stopped rushing it.',
    'jaipur-filmmakers', ['filmmaking', 'directing'], 6),
  post('dev', 'ask', 'What does a genuinely useful revision app need?',
    'I have offline flashcards working. Before I add anything else, I’d love to hear from educators: what helps learners recall an idea rather than just tap through a deck? Looking for one focused test session.',
    'study-circle', ['mobile-dev', 'teaching'], 7),
  post('sana', 'teach', 'Teach it back in sixty seconds',
    'Our next chemistry session starts with one question: can you explain equilibrium to a friend without reading a definition? Bring your own example. We’ll improve the explanation together — no marks, no judgement.',
    'study-circle', ['chemistry', 'teaching'], 8),
  post('arjun', 'challenge', 'Ten minutes counts. So does starting again.',
    'This week’s optional challenge: choose a little movement that feels right for you on three days. Walking, stretching, dancing — your choice. Rest when you need it. Share how it felt, not a calorie count.',
    'move-together', ['fitness', 'running'], 9),
  post('tara', 'collaborate', 'A song looking for its other half',
    'I have a chorus, a creaky guitar recording and a melody I can’t stop humming. Looking for a producer who likes intimate acoustic sound. Let’s start with one verse and agree on credits before recording.',
    'bedroom-sessions', ['music', 'guitar'], 10,
    { skillsNeeded: ['music-production-skill'], location: null, time: 'Evenings this fortnight', paid: false }),
  post('neil', 'share', 'My first game has one room and one very opinionated cat',
    'Cutting the scope from “cosy village simulator” to “find the cat’s favourite chair” finally made this finishable. The prototype takes two minutes. Looking for feedback on whether the controls feel obvious.',
    'build-in-public', ['gaming', 'game-dev'], 11),
  post('simran', 'ask', 'How do you stop sounding like you’re reading a script?',
    'My first student-budget video is filmed, but the voiceover feels like a class presentation. Do you record from bullet points, talk to a friend, or just keep practising? Practical experiments welcome.',
    'youtube-lab', ['youtube', 'writing'], 12),
  post('aditya', 'share', 'A smaller AI feature turned out to be the useful one',
    'Instead of generating a whole study plan, our prototype now groups notes and shows the original source next to every suggestion. Testing with five friends taught us to make the limits visible.',
    'build-in-public', ['ai', 'llms', 'coding'], 13),
  post('naina', 'teach', 'One window is a perfectly good portrait studio',
    'Start with soft window light, turn off competing lights, and give your subject something comfortable to do with their hands. Ask what they like about the photo before offering your own opinion.',
    'photo-walks', ['photography', 'portrait'], 14),
  post('yusuf', 'collaborate', 'Let’s give your short film a sound of its own',
    'I’m collecting gentle room tones and building a small palette for an indie short. Looking for a filmmaker to try a thirty-second scene with. We’ll agree on a simple brief and share feedback before expanding.',
    'jaipur-filmmakers', ['music-production', 'filmmaking'], 15,
    { skillsNeeded: ['video-shooting'], location: null, time: 'This month', paid: false }),
  post('pema', 'share', 'A travel story doesn’t need a famous destination',
    'I spent a morning learning how my neighbour makes her favourite dumplings, with her permission to share the process. The best part wasn’t the finished plate — it was the story behind the recipe.',
    'youtube-lab', ['travel', 'food', 'video-essays'], 16),
  post('kavya', 'meet', 'A speaking room where you can take your time',
    'Thirty minutes of friendly English conversation for adult learners. This week: a place that feels like home. Passing is okay, accents are welcome, and we only correct when someone asks.',
    'study-circle', ['english-speaking', 'languages'], 17,
    { skillsNeeded: [], location: 'Online', time: 'Tomorrow evening', paid: false }),
  post('aman', 'meet', 'Anyone up for a no-pressure co-op evening?',
    'Looking for a small weekend squad that enjoys explaining the game to newcomers. No ranked grind, no shouting. Also making a beginner guide and could use someone to tell me where it stops making sense.',
    null, ['gaming', 'esports'], 18),
  post('ritika', 'ask', 'Before we build the shop, what should we ask?',
    'We’re testing a repair-first clothing idea with ten conversations this week. Trying to ask about people’s actual habits, not whether they “like the idea”. What is a question that helped you uncover a real need?',
    'build-in-public', ['entrepreneurship', 'ecommerce', 'startups'], 19),
];
seedPosts[1].comments.push({ id: 'comment-me-script', userId: 'me', text: 'I’d love to read it. A sound that repeats with one small change could build that tension without showing anything.', createdAt: NOW - HOUR });
seedPosts[2].comments.push({ id: 'comment-me-walk', userId: 'me', text: 'Count me in. I’ll bring a phone and a few ideas for turning the photos into a short story.', createdAt: NOW - 2 * HOUR });
seedPosts[12].comments.push({ id: 'comment-me-voice', userId: 'me', text: 'Try recording the explanation as a voice note to one friend, then use that as your first take. It helped me sound more like myself.', createdAt: NOW - 4 * HOUR });
seedPosts[7].helpedBy = ['sana'];
seedPosts[19].comments.push({ id: 'comment-ananya-research', userId: 'ananya', text: 'Ask about the last item they repaired and what made it easy or difficult. A real recent story beats a hypothetical yes.', createdAt: NOW - 6 * HOUR });

// Deliberately no existing connection, request, or DM with Aarav: the first
// discovery → connect → introduction journey must remain available.
export const seedConnections: Connection[] = [
  { id: 'connection-kabir', aUserId: 'me', bUserId: 'kabir', createdAt: ago(8), level: 'collaborated' },
  { id: 'connection-ananya', aUserId: 'me', bUserId: 'ananya', createdAt: ago(3), level: 'interacted' },
  { id: 'connection-tara-yusuf', aUserId: 'tara', bUserId: 'yusuf', createdAt: ago(6), level: 'collaborated' },
  { id: 'connection-rohan-dev', aUserId: 'rohan', bUserId: 'dev', createdAt: ago(5), level: 'interacted' },
];

export const seedRequests: ConnectionRequest[] = [
  { id: 'request-isha', fromUserId: 'isha', toUserId: 'me', why: 'Your filmmaking channel sounds exciting. I can help with thumbnails and would love your storytelling feedback on my portfolio.', status: 'pending', createdAt: NOW - 2 * HOUR },
  { id: 'request-simran', fromUserId: 'simran', toUserId: 'me', why: 'We’re both starting YouTube channels. Want to trade script feedback and keep each other accountable?', status: 'pending', createdAt: NOW - 5 * HOUR },
  { id: 'request-zoya', fromUserId: 'me', toUserId: 'zoya', why: 'I’m learning to tell more thoughtful stories on film. I can help with your series launch in exchange for feedback on my first shot list.', status: 'pending', createdAt: ago(1) },
  { id: 'request-ananya-accepted', fromUserId: 'ananya', toUserId: 'me', why: 'I can help you simplify your channel identity; could you give feedback on the story behind my habit tracker?', status: 'connected', createdAt: ago(4), respondedAt: ago(3) },
];

export const seedConversations: Conversation[] = [
  { id: 'conversation-kabir', memberIds: ['me', 'kabir'], createdAt: ago(8), connectionId: 'connection-kabir',
    sharedContext: ['You are building a filmmaking channel.', 'Kabir can help with photography and cinematography; you can help shape his city story.'],
    introMessageId: 'message-kabir-intro', muted: false },
  { id: 'conversation-ananya', memberIds: ['me', 'ananya'], createdAt: ago(3), connectionId: 'connection-ananya',
    sharedContext: ['You can help Ananya explain the story behind her prototype.', 'Ananya can help make your channel identity clearer and more accessible.'],
    introMessageId: 'message-ananya-intro', muted: false },
];

function message(id: string, conversationId: string, senderId: string, text: string, createdAt: number, read = true, kind: Message['kind'] = 'text'): Message {
  return { id, conversationId, senderId, text, kind, createdAt, deliveredAt: createdAt + 1000, readAt: read ? createdAt + 60_000 : null };
}

export const seedMessages: Message[] = [
  message('message-kabir-intro', 'conversation-kabir', 'nexus', 'Prince, meet Kabir 👋 You’re building a filmmaking channel, and Kabir brings photography and cinematography. Prince can help shape the story for Kabir’s city zine. You’re both in Jaipur and free on weekends. A small photo walk could be a good place to start. — Demo introduction', ago(8), true, 'intro'),
  message('message-kabir-1', 'conversation-kabir', 'kabir', 'Hey Prince! Your idea of finding stories in everyday places is exactly what I love photographing.', ago(7.9)),
  message('message-kabir-2', 'conversation-kabir', 'me', 'Likewise! Could we try a short photo story before we plan a whole video?', ago(7.8)),
  message('message-kabir-3', 'conversation-kabir', 'kabir', 'Perfect. Twelve frames, one neighbourhood. We can plan around a public café and ask before photographing anyone.', ago(7.7)),
  message('message-kabir-4', 'conversation-kabir', 'me', 'I’ve drafted three story prompts. I’ll bring them to the circle.', ago(1)),
  message('message-kabir-5', 'conversation-kabir', 'kabir', 'The prompts look great! Are you still up for the photo walk this weekend? Phone cameras are welcome too.', NOW - 18 * 60_000, false),
  message('message-ananya-intro', 'conversation-ananya', 'nexus', 'Prince, meet Ananya 👋 Prince brings storytelling and marketing; Ananya brings product and graphic design. Try trading a channel-identity review for feedback on her prototype story. — Demo introduction', ago(3), true, 'intro'),
  message('message-ananya-1', 'conversation-ananya', 'ananya', 'Hi! I loved your idea of making filmmaking feel approachable. What should someone feel after seeing your channel?', ago(2.8)),
  message('message-ananya-2', 'conversation-ananya', 'me', 'That they can start with what they have. Curious and encouraged, rather than intimidated by gear.', ago(2.7)),
  message('message-ananya-3', 'conversation-ananya', 'ananya', 'That’s a strong starting point. I have two directions to show you — both simple enough to work on a tiny thumbnail.', NOW - 2 * HOUR, false),
];

export const seedNotifications: Notification[] = [
  { id: 'notification-request', kind: 'connection-request', actorUserId: 'isha', text: 'Isha wants to trade thumbnail design for your storytelling feedback.', meta: { userId: 'isha' }, createdAt: NOW - 2 * HOUR, read: false },
  { id: 'notification-accepted', kind: 'connection-accepted', actorUserId: 'ananya', text: 'You and Ananya are connected. Start with a small feedback exchange.', meta: { userId: 'ananya', conversationId: 'conversation-ananya' }, createdAt: ago(3), read: true },
  { id: 'notification-message', kind: 'new-message', actorUserId: 'kabir', text: 'Kabir: “Are you still up for the photo walk this weekend?”', meta: { conversationId: 'conversation-kabir', userId: 'kabir' }, createdAt: NOW - 18 * 60_000, read: false },
  { id: 'notification-intent', kind: 'intent-response', actorUserId: 'simran', text: 'Simran is interested in your filmmaking channel intent and wants to swap script feedback.', meta: { intentId: 'intent-me', userId: 'simran' }, createdAt: NOW - 5 * HOUR, read: false },
  { id: 'notification-match', kind: 'new-match', actorUserId: 'aarav', text: 'Aarav can help with video editing. You can help him with storytelling — a complementary fit.', meta: { userId: 'aarav', intentId: 'intent-me' }, createdAt: NOW - HOUR, read: false },
  { id: 'notification-circle', kind: 'circle-invite', actorUserId: 'ananya', text: 'Ananya invited you to Design for Real People — a 14-day prototype sprint.', meta: { circleId: 'design-sprint', userId: 'ananya' }, createdAt: ago(1), read: false },
];

export const seedEvents: CircleEvent[] = [
  { id: 'event-script-table', circleId: 'jaipur-filmmakers', title: 'The Last Light: friendly table read', detail: 'Read Meera’s five-minute script, then share one thing that worked and one question. No acting experience needed. Demo event.', at: ahead(2), location: 'Jaipur · public community café (demo)', goingIds: ['meera', 'aarav', 'me', 'kabir'] },
  { id: 'event-rough-cuts', circleId: 'youtube-lab', title: 'Rough cuts, kind feedback', detail: 'Bring a sixty-second draft. We’ll focus on pacing and the first ten seconds, not gear. Demo event.', at: ahead(1), location: 'Online · circle room (demo)', goingIds: ['simran', 'aarav', 'isha', 'me'] },
  { id: 'event-demo-night', circleId: 'build-in-public', title: 'Tiny demo night', detail: 'Five minutes each: show one working feature, one lesson and one thing you need help with. Demo event.', at: ahead(4), location: 'Online · circle room (demo)', goingIds: ['rohan', 'ananya', 'dev', 'aditya', 'ritika'] },
  { id: 'event-photo-walk', circleId: 'photo-walks', title: 'Twelve frames, one morning', detail: 'An easy city photo walk with a small group. Public meeting point confirmed in the circle; ask permission before portraits. Demo event.', at: ahead(3), location: 'Jaipur · public café meeting point (demo)', goingIds: ['kabir', 'me', 'meera'] },
  { id: 'event-design-crit', circleId: 'design-sprint', title: 'Accessible by default: critique hour', detail: 'Review contrast, keyboard navigation and plain-language labels together. Bring one screen. Demo event.', at: ahead(2.5), location: 'Online · circle room (demo)', goingIds: ['ananya', 'isha', 'rohan'] },
  { id: 'event-morning-reset', circleId: 'move-together', title: 'A gentle morning reset', detail: 'Optional check-in and ten minutes of movement at your own pace. Rest is welcome; no medical or fitness promises. Demo event.', at: ahead(1.5), location: 'Online · circle room (demo)', goingIds: ['arjun', 'ritika', 'simran'] },
  { id: 'event-listening-room', circleId: 'bedroom-sessions', title: 'Unfinished songs listening room', detail: 'Share a verse, hum a melody, or just listen. Agree on credits before collaboration. Demo event.', at: ahead(3.5), location: 'Online · circle room (demo)', goingIds: ['tara', 'yusuf', 'neil'] },
  { id: 'event-teach-back', circleId: 'study-circle', title: 'Explain equilibrium without a textbook', detail: 'A supportive adult learner session with Sana. Bring an everyday example and a question. Demo event.', at: ahead(2), location: 'Online · circle room (demo)', goingIds: ['sana', 'dev', 'kavya', 'simran'] },
];

export const seedProjects: CircleProject[] = [
  { id: 'project-last-light', circleId: 'jaipur-filmmakers', title: 'The Last Light · a five-minute horror short', ownerUserId: 'meera', status: 'active' },
  { id: 'project-sound-study', circleId: 'jaipur-filmmakers', title: 'One room, three moods · sound study', ownerUserId: 'aarav', status: 'done' },
  { id: 'project-channel-pilot', circleId: 'youtube-lab', title: 'Prince’s filmmaking channel · three-video pilot', ownerUserId: 'me', status: 'active' },
  { id: 'project-student-budget', circleId: 'youtube-lab', title: 'Student budgets, honestly · first episode', ownerUserId: 'simran', status: 'active' },
  { id: 'project-study-planner', circleId: 'build-in-public', title: 'Offline-first study planner', ownerUserId: 'rohan', status: 'active' },
  { id: 'project-cat-game', circleId: 'build-in-public', title: 'Find the cat’s chair · playable prototype', ownerUserId: 'neil', status: 'done' },
  { id: 'project-city-zine', circleId: 'photo-walks', title: 'Twelve Frames of Jaipur · community zine', ownerUserId: 'kabir', status: 'active' },
  { id: 'project-habit-ui', circleId: 'design-sprint', title: 'A calmer habit tracker · accessible prototype', ownerUserId: 'ananya', status: 'active' },
  { id: 'project-movement-log', circleId: 'move-together', title: 'Thirty days of small steps · shared reflections', ownerUserId: 'arjun', status: 'active' },
  { id: 'project-acoustic-ep', circleId: 'bedroom-sessions', title: 'The long way home · three-song EP', ownerUserId: 'tara', status: 'active' },
  { id: 'project-chemistry', circleId: 'study-circle', title: 'Ten chemistry ideas, clearly explained', ownerUserId: 'sana', status: 'active' },
];

/** Return isolated mutable state, so reset/demo sessions never mutate the fixtures. */
export function buildSeed(): AppState {
  return structuredClone({
    version: 1, meId: 'me', signedIn: false, onboardingComplete: false,
    users: seedUsers, intents: seedIntents, requests: seedRequests,
    connections: seedConnections, conversations: seedConversations,
    messages: seedMessages, posts: seedPosts, circles: seedCircles,
    circleEvents: seedEvents, circleProjects: seedProjects,
    notifications: seedNotifications, reports: [], blockedUsers: [],
    mutedUsers: [], passedUserIds: [], analyticsEvents: [],
  });
}

