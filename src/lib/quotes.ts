export type Quote = { text: string; author: string };

// Poetic lines from scientists and philosophers on freedom of spirit, the
// universe, infinity, impermanence, and the craft of building things.
export const QUOTES: Quote[] = [
  { text: "The important thing is not to stop questioning. Curiosity has its own reason for existing.", author: "Albert Einstein" },
  { text: "Look deep into nature, and then you will understand everything better.", author: "Albert Einstein" },
  { text: "A human being is a part of the whole, called by us 'Universe.' Our task must be to free ourselves from this prison by widening our circle of compassion.", author: "Albert Einstein" },
  { text: "We are a way for the cosmos to know itself.", author: "Carl Sagan" },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
  { text: "The cosmos is within us. We are made of star-stuff.", author: "Carl Sagan" },
  { text: "For small creatures such as we, the vastness is bearable only through love.", author: "Carl Sagan" },
  { text: "I would rather have questions that can't be answered than answers that can't be questioned.", author: "Richard Feynman" },
  { text: "Study hard what interests you the most, in the most undisciplined, irreverent, and original manner possible.", author: "Richard Feynman" },
  { text: "The present is theirs; the future, for which I really worked, is mine.", author: "Nikola Tesla" },
  { text: "My brain is only a receiver. In the Universe there is a core from which we obtain knowledge, strength, and inspiration.", author: "Nikola Tesla" },
  { text: "Nothing in life is to be feared, it is only to be understood.", author: "Marie Curie" },
  { text: "Be less curious about people and more curious about ideas.", author: "Marie Curie" },
  { text: "I do not know what I may appear to the world, but to myself I seem to have been only like a boy playing on the seashore, whilst the great ocean of truth lay all undiscovered before me.", author: "Isaac Newton" },
  { text: "How wonderful that we have met with a paradox. Now we have some hope of making progress.", author: "Niels Bohr" },
  { text: "What we observe is not nature itself, but nature exposed to our method of questioning.", author: "Werner Heisenberg" },
  { text: "The universe is not only stranger than we imagine, it is stranger than we can imagine.", author: "J.B.S. Haldane" },
  { text: "Remember to look up at the stars and not down at your feet.", author: "Stephen Hawking" },
  { text: "Intelligence is the ability to adapt to change.", author: "Stephen Hawking" },
  { text: "You never change things by fighting the existing reality. To change something, build a new model that makes the existing model obsolete.", author: "Buckminster Fuller" },
  { text: "There is nothing in a caterpillar that tells you it's going to be a butterfly.", author: "Buckminster Fuller" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "Nothing is too wonderful to be true, if it be consistent with the laws of nature.", author: "Michael Faraday" },
  { text: "And yet it moves.", author: "Galileo Galilei" },
  { text: "The diversity of the phenomena of nature is so great, and the treasures hidden in the heavens so rich, precisely in order that the human mind shall never be lacking in fresh nourishment.", author: "Johannes Kepler" },
  { text: "The purpose of thinking about the future is not to predict it but to raise people's hopes.", author: "Freeman Dyson" },
  { text: "The task is not so much to see what no one has yet seen, but to think what nobody has yet thought about that which everybody sees.", author: "Erwin Schrödinger" },
  { text: "The Tao that can be told is not the eternal Tao.", author: "Lao Tzu" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "You are not a drop in the ocean. You are the entire ocean in a drop.", author: "Rumi" },
  { text: "The wound is the place where the light enters you.", author: "Rumi" },
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "The universe is change; our life is what our thoughts make it.", author: "Marcus Aurelius" },
  { text: "No man ever steps in the same river twice, for it's not the same river and he's not the same man.", author: "Heraclitus" },
  { text: "The only constant in life is change.", author: "Heraclitus" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "One must still have chaos in oneself to be able to give birth to a dancing star.", author: "Friedrich Nietzsche" },
  { text: "The more clearly you understand yourself and your emotions, the more you become a lover of what is.", author: "Baruch Spinoza" },
  { text: "The only way to make sense out of change is to plunge into it, move with it, and join the dance.", author: "Alan Watts" },
  { text: "You are an aperture through which the universe is looking at and exploring itself.", author: "Alan Watts" },
  { text: "Who looks outside, dreams; who looks inside, awakes.", author: "Carl Jung" },
  { text: "The privilege of a lifetime is to become who you truly are.", author: "Carl Jung" },
  { text: "The present moment is the only moment available to us, and it is the door to all moments.", author: "Thich Nhat Hanh" },
  { text: "Because you are alive, everything is possible.", author: "Thich Nhat Hanh" },
  { text: "The mind is everything. What you think, you become.", author: "Buddha" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { text: "The universe is wider than our views of it.", author: "Henry David Thoreau" },
  { text: "The creation of a thousand forests is in one acorn.", author: "Ralph Waldo Emerson" },
];

// Deliberately impure: picks a fresh quote each time the (already
// per-request, non-cached) dashboard Server Component renders.
export function getRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
