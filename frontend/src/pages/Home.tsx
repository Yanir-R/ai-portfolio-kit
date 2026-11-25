import React from 'react';
import HeroSection from '@/components/home/HeroSection';
import Spine from '@/components/home/Spine';
import BuildSection from '@/components/home/BuildSection';
import ProofSection from '@/components/home/ProofSection';
import FleetSection from '@/components/home/FleetSection';
import PathSection from '@/components/home/PathSection';
import HowSection from '@/components/home/HowSection';
import BriefSection from '@/components/home/BriefSection';
import FaqSection from '@/components/home/FaqSection';
import PostsSection from '@/components/home/PostsSection';

/*
 * The home page, top to bottom: the hero with the live chat, then the
 * sections joined by the spine (what I build, what already runs, the agent
 * fleet, the path so far, how we work, the brief), then the FAQ and the
 * latest posts. The hire band and the footer come from the layout.
 */
const Home: React.FC = () => (
    <>
        <HeroSection />
        <Spine>
            <BuildSection />
            <ProofSection />
            <FleetSection />
            <PathSection />
            <HowSection />
            <BriefSection />
        </Spine>
        <FaqSection />
        <PostsSection />
    </>
);

export default Home;
