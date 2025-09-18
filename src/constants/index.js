import {
  mobile,
  backend,
  creator,
  web,
  javascript,
  typescript,
  html,
  css,
  reactjs,
  redux,
  tailwind,
  nodejs,
  mongodb,
  git,
  figma,
  docker,
  meta,
  starbucks,
  tesla,
  fmg,
  randm,
  genesys,
  shopify,
  tripleawriters,
  ravenandmacaw,
  mst,
  vuejobs,
  carrent,
  threejs,
  shopapi,
  talatech,
  merryhill,
} from "../assets";

export const navLinks = [
  {
    id: "about",
    title: "About",
  },
  {
    id: "work",
    title: "Work",
  },
  {
    id: "contact",
    title: "Contact",
  },
];

const services = [
  {
    title: "Web Developer",
    icon: web,
  },
  {
    title: "React Native Developer",
    icon: mobile,
  },
  {
    title: "Full Stack Developer",
    icon: backend,
  },
  {
    title: "Wordpress Developer",
    icon: creator,
  },
];

const technologies = [
  {
    name: "HTML 5",
    icon: html,
  },
  {
    name: "CSS 3",
    icon: css,
  },
  {
    name: "JavaScript",
    icon: javascript,
  },
  {
    name: "TypeScript",
    icon: typescript,
  },
  {
    name: "React JS",
    icon: reactjs,
  },
  {
    name: "Redux Toolkit",
    icon: redux,
  },
  {
    name: "Tailwind CSS",
    icon: tailwind,
  },
  {
    name: "Node JS",
    icon: nodejs,
  },
  {
    name: "MongoDB",
    icon: mongodb,
  },
  {
    name: "Three JS",
    icon: threejs,
  },
  {
    name: "git",
    icon: git,
  },
  {
    name: "figma",
    icon: figma,
  },
  {
    name: "wordpress",
    icon: docker,
  },
];

const experiences = [
  {
    title: "Junior Software Developer",
    company_name: "Genesys Tech Hub",
    icon: genesys,
    iconBg: "#383E56",
    date: "March 2022 - Aug 2022",
    points: [
      "Developing and maintaining web applications using React.js and other related technologies.",
      "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
      "Implementing responsive design and ensuring cross-browser compatibility.",
      "Participating in code reviews and providing constructive feedback to other developers.",
    ],
  },
  {
    title: "Web Developer",
    company_name: "Foretrust Digital Center",
    icon: fmg,
    iconBg: "#E6DEDD",
    date: "Sep 2023 - Jan 2024",
    points: [
      "Developing and maintaining web applications using React.js and other related technologies.",
      "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
      "Implementing responsive design and ensuring cross-browser compatibility.",
      "Participating in code reviews and providing constructive feedback to other developers.",
    ],
  },
  {
    title: "Web Developer",
    company_name: "FMG Nigeria",
    icon: fmg,
    iconBg: "#383E56",
    date: "Mar 2024 - Dec 2024",
    points: [
      "Developing and maintaining web applications using React.js and other related technologies.",
      "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
      "Implementing responsive design and ensuring cross-browser compatibility.",
      "Participating in code reviews and providing constructive feedback to other developers.",
    ],
  },
  {
    title: "Full stack Developer",
    company_name: "Raven and Macaw",
    icon: randm,
    iconBg: "#E6DEDD",
    date: "Jan 2025 - Present",
    points: [
      "Developing and maintaining web applications using React.js and other related technologies.",
      "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
      "Implementing responsive design and ensuring cross-browser compatibility.",
      "Participating in code reviews and providing constructive feedback to other developers.",
    ],
  },
];

const testimonials = [
  {
    testimonial:
      "I thought it was impossible to make a website as beautiful as our product, but Rick proved me wrong.",
    name: "Ifunanya Onyema",
    designation: "CFO",
    company: "Raven and Macaw",
    image: "https://randomuser.me/api/portraits/women/4.jpg",
  },
  {
    testimonial:
      "I've never met a web developer who truly cares about their clients' success like Rick does.",
    name: "Chris Brown",
    designation: "COO",
    company: "DEF Corp",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
  },
  {
    testimonial:
      "After Rick optimized our website, our traffic increased by 50%. We can't thank them enough!",
    name: "Lisa Wang",
    designation: "CTO",
    company: "456 Enterprises",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
  },
];

const projects = [
  {
    name: "Raven and Macaw",
    description:
      "Designed, developed, and deployed the official website for Raven & Macaw, a business consulting firm, with a modern responsive layout, and optimized user experience.",
    tags: [
      {
        name: "Next.js",
        color: "blue-text-gradient",
      },
      {
        name: "GraphQL",
        color: "green-text-gradient",
      },
      {
        name: "tailwind",
        color: "pink-text-gradient",
      },
    ],
    image: ravenandmacaw,
    source_code_link: "https://ravenandmacaw.com",
  },
  {
    name: "Montana Speedy Title",
    description:
      "Platform connecting writers with clients, allowing users to find writing jobs, access estimated pay rates, and secure projects based on their expertise",
    tags: [
      {
        name: "Wordpress",
        color: "blue-text-gradient",
      },
      {
        name: "Elementor",
        color: "green-text-gradient",
      },
      {
        name: "css",
        color: "pink-text-gradient",
      },
    ],
    image: mst,
    source_code_link: "https://montanaspeedytitle.com/",
  },
  {
    name: "Shop-Api",
    description:
      "RESTful API for managing an online store, enabling users to browse products, handle orders, process payments, and manage inventory efficiently",
    tags: [
      {
        name: "Node.Js",
        color: "blue-text-gradient",
      },
      {
        name: "mongoDB",
        color: "green-text-gradient",
      },
      {
        name: "ExpressJs",
        color: "pink-text-gradient",
      },
    ],
    image: shopapi,
    source_code_link: "https://shop-api-demo.herokuapp.com",
  },
  {
    name: "Vue Jobs Platform",
    description:
      "A comprehensive job board platform built with Vue.js, featuring job listings, company profiles, and application tracking with modern UI/UX design",
    tags: [
      {
        name: "React.js",
        color: "blue-text-gradient",
      },
      {
        name: "Sanity",
        color: "red-text-gradient",
      },
      {
        name: "CSS3",
        color: "pink-text-gradient",
      },
    ],
    image: vuejobs,
    source_code_link: "https://vue-jobs-zeta.vercel.app/",
  },
  {
    name: "Talatech",
    description:
      "Built and deployed the official website for TalaTech, a digital services platform that helps service-based businesses (restaurants, barbers, etc.) establish a strong online presence",
    tags: [
      {
        name: "Wordpress",
        color: "blue-text-gradient",
      },
      {
        name: "Elementor",
        color: "green-text-gradient",
      },
      {
        name: "CSS",
        color: "pink-text-gradient",
      },
    ],
    image: talatech,
    source_code_link: "https://talatech.io",
  },
  {
    name: "EyeCare Merry Hill Revamp",
    description:
      "Developed and deployed the website for EyeCare Merry Hill, an independent eye-health and luxury optical retailer based in Merry Hill Shopping Centre",
    tags: [
      {
        name: "Wordpress",
        color: "blue-text-gradient",
      },
      {
        name: "Elementor",
        color: "green-text-gradient",
      },
      {
        name: "CSS",
        color: "pink-text-gradient",
      },
    ],
    image: merryhill,
    source_code_link: "https://merryhill.ravenvision.co.uk/",
  },
];

export { services, technologies, experiences, testimonials, projects };
