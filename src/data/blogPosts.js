export const BLOG_POSTS = [
  {
    slug: "ten-signs-you-may-have-mold-in-your-home",
    title: "10 Signs You May Have Mold in Your Home: A Homeowner's Practical Guide",
    metaTitle: "10 Signs You May Have Mold in Your Home | Total Testing",
    metaDescription:
      "Wondering if that musty odor or dark spot is mold? Learn 10 key signs of indoor mold growth, how to sample surfaces correctly, and when to test.",
    keyword: "10 signs you may have mold in your home",
    date: "2026-09-16",
    excerpt:
      "Musty odor, water stains, bubbling paint, high humidity, and more — how to recognize indoor mold and get lab-verified answers before you guess.",
  },
];

export const getBlogPost = (slug) => BLOG_POSTS.find((post) => post.slug === slug);
