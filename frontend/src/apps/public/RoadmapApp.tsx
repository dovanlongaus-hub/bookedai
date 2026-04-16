import {
  ctaContent,
  roadmapContent,
  technicalArchitectureContent,
} from '../../components/landing/data';
import { Footer } from '../../components/landing/Footer';
import { Header } from '../../components/landing/Header';
import { CallToActionSection } from '../../components/landing/sections/CallToActionSection';
import { RoadmapSection } from '../../components/landing/sections/RoadmapSection';

type RoadmapAppProps = {
  onStartTrial: () => void;
  onBookDemo: () => void;
};

export function RoadmapApp({ onStartTrial, onBookDemo }: RoadmapAppProps) {
  return (
    <main className="apple-public-shell relative overflow-hidden">
      <Header
        navItems={['Architecture Streams', 'Tech Stack', 'Agent Roles', 'Delivery Timeline']}
        onStartTrial={onStartTrial}
        onBookDemo={onBookDemo}
      />

      <div className="pt-6">
        <RoadmapSection
          content={roadmapContent}
          architectureContent={technicalArchitectureContent}
        />
      </div>

      <CallToActionSection
        content={{
          ...ctaContent,
          title: 'Share the roadmap when you need the deeper product story',
          body: 'Use this standalone roadmap page for investor decks, partner conversations, architecture reviews, and execution updates without loading the full landing flow.',
        }}
        onStartTrial={onStartTrial}
        onBookDemo={onBookDemo}
      />

      <Footer onStartTrial={onStartTrial} onBookDemo={onBookDemo} />
    </main>
  );
}
