import React from "react";
import ParallaxTilt from "react-parallax-tilt";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';

// Import custom slider styles
import './ProjectSlider.css';

import { styles } from "../styles";
import { SectionWrapper } from "../hoc";
import { projects } from "../constants";
import { fadeIn, textVariant } from "../utils/motion";

const ProjectCard = ({
  index,
  name,
  description,
  tags,
  image,
  source_code_link,
}) => {
  const handleClick = () => {
    console.log('Card clicked! Opening:', source_code_link);
    window.open(source_code_link, "_blank");
  };

  // Create staggered animation variants (alternating up and down)
  const getAnimationVariant = (cardIndex) => {
    const pattern = cardIndex % 4; // Create a pattern of 4 different animations
    switch (pattern) {
      case 0:
        return fadeIn("up", "spring", 0.2, 0.75);
      case 1:
        return fadeIn("down", "spring", 0.4, 0.75);
      case 2:
        return fadeIn("up", "spring", 0.6, 0.75);
      case 3:
        return fadeIn("down", "spring", 0.8, 0.75);
      default:
        return fadeIn("up", "spring", 0.2, 0.75);
    }
  };

  return (
    <motion.div 
      variants={getAnimationVariant(index)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.3 }}
      className="project-card-container"
    >
      <ParallaxTilt
        className='bg-tertiary p-5 rounded-2xl sm:w-[360px] w-full cursor-pointer hover:bg-opacity-90 transition-all duration-300'
        tiltMaxAngleX={45}
        tiltMaxAngleY={45}
        scale={1}
        transitionSpeed={450}
      >
        <div onClick={handleClick} className="w-full h-full">
          <div className='relative w-full h-[230px]'>
            <img
              src={image}
              alt='project_image'
              className='w-full h-full object-cover rounded-2xl hover:opacity-90 transition-opacity duration-300'
            />
          </div>

          <div className='mt-5'>
            <h3 className='text-white font-bold text-[24px]'>{name}</h3>
            <p className='mt-2 text-secondary text-[14px]'>{description}</p>
          </div>

          <div className='mt-4 flex flex-wrap gap-2'>
            {tags.map((tag) => (
              <p
                key={`${name}-${tag.name}`}
                className={`text-[14px] ${tag.color}`}
              >
                #{tag.name}
              </p>
            ))}
          </div>
        </div>
      </ParallaxTilt>
    </motion.div>
  );
};

const Works = () => {
  const [swiperInstance, setSwiperInstance] = React.useState(null);

  const handleSlideChange = () => {
    // Optional: Add any logic when slide changes
  };

  const handleTouchStart = () => {
    // Pause autoplay when user starts dragging
    if (swiperInstance && swiperInstance.autoplay) {
      swiperInstance.autoplay.stop();
    }
  };

  const handleTouchEnd = () => {
    // Resume autoplay after user stops dragging (with delay)
    if (swiperInstance && swiperInstance.autoplay) {
      setTimeout(() => {
        swiperInstance.autoplay.start();
      }, 2000); // Resume after 2 seconds
    }
  };

  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={`${styles.sectionSubText} `}>My work</p>
        <h2 className={`${styles.sectionHeadText}`}>Projects.</h2>
      </motion.div>

      <div className='w-full flex'>
        <motion.p
          variants={fadeIn("", "", 0.1, 1)}
          className='mt-3 text-secondary text-[17px] max-w-3xl leading-[30px]'
        >
          Following projects showcases my skills and experience through
          real-world examples of my work. Each project is briefly described with
          links to live demos. It reflects my ability to solve complex problems, 
          work with different technologies, and manage projects effectively.
        </motion.p>
      </div>

      <div className='mt-20 w-full overflow-hidden'>
        <Swiper
          modules={[Autoplay]}
          spaceBetween={30}
          slidesPerView="auto"
          centeredSlides={false}
          loop={true}
          autoplay={{
            delay: 0,
            disableOnInteraction: true,
            pauseOnMouseEnter: true,
            reverseDirection: false,
          }}
          speed={3000}
          allowTouchMove={true}
          simulateTouch={true}
          grabCursor={true}
          resistance={true}
          resistanceRatio={0.5}
          onSwiper={setSwiperInstance}
          onSlideChange={handleSlideChange}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => swiperInstance?.autoplay?.stop()}
          onMouseLeave={() => swiperInstance?.autoplay?.start()}
          breakpoints={{
            320: {
              slidesPerView: 1.2,
              spaceBetween: 20,
            },
            640: {
              slidesPerView: 1.5,
              spaceBetween: 25,
            },
            768: {
              slidesPerView: 2.2,
              spaceBetween: 30,
            },
            1024: {
              slidesPerView: 3.2,
              spaceBetween: 35,
            },
            1280: {
              slidesPerView: 4,
              spaceBetween: 40,
            },
          }}
          className="projects-marquee"
        >
          {/* Duplicate projects for seamless loop */}
          {[...projects, ...projects].map((project, index) => (
            <SwiperSlide key={`project-${index}`} className="!w-auto">
              <ProjectCard index={index} {...project} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </>
  );
};

export default SectionWrapper(Works, "");