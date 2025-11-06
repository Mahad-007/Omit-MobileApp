import { DashboardCard } from "@/components/DashboardCard";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const quotes = [
  {
    text: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
  },
  {
    text: "Focus on being productive instead of busy.",
    author: "Tim Ferriss",
  },
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "Productivity is never an accident. It is always the result of commitment to excellence.",
    author: "Paul J. Meyer",
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
  },
  {
    text: "The future depends on what you do today.",
    author: "Mahatma Gandhi",
  },
];

const affirmations = [
  "I am focused and productive",
  "I accomplish my goals with ease",
  "I am in control of my time",
  "My work has purpose and meaning",
  "I stay calm and focused under pressure",
  "I am making progress every day",
  "I choose productivity over distraction",
  "I am capable of achieving great things",
];

export default function Motivation() {
  const [currentQuote, setCurrentQuote] = useState(0);
  const [currentAffirmation, setCurrentAffirmation] = useState(0);

  const refreshQuote = () => {
    setCurrentQuote((prev) => (prev + 1) % quotes.length);
  };

  const refreshAffirmation = () => {
    setCurrentAffirmation((prev) => (prev + 1) % affirmations.length);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Motivation Mode</h2>
        <p className="text-muted-foreground">Stay inspired and focused on your goals</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Daily Quote" icon={Sparkles}>
          <div className="bg-gradient-primary rounded-lg p-8 text-white min-h-[200px] flex flex-col justify-between">
            <div>
              <p className="text-xl font-medium mb-4 leading-relaxed">
                "{quotes[currentQuote].text}"
              </p>
              <p className="text-sm opacity-90">— {quotes[currentQuote].author}</p>
            </div>
          </div>
          <Button
            onClick={refreshQuote}
            variant="outline"
            className="w-full mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </DashboardCard>

        <DashboardCard title="Positive Affirmation" icon={Sparkles}>
          <div className="bg-gradient-accent rounded-lg p-8 text-white min-h-[200px] flex items-center justify-center">
            <p className="text-2xl font-bold text-center leading-relaxed">
              {affirmations[currentAffirmation]}
            </p>
          </div>
          <Button
            onClick={refreshAffirmation}
            variant="outline"
            className="w-full mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            New Affirmation
          </Button>
        </DashboardCard>
      </div>

      <DashboardCard title="All Quotes" icon={Sparkles}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quotes.map((quote, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors border border-border"
            >
              <p className="text-sm font-medium text-foreground mb-2">"{quote.text}"</p>
              <p className="text-xs text-muted-foreground">— {quote.author}</p>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title="Affirmations Library" icon={Sparkles}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {affirmations.map((affirmation, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-gradient-card border border-border text-center hover:shadow-card transition-shadow"
            >
              <p className="text-sm font-medium text-foreground">{affirmation}</p>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
