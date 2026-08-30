import SessionTester from '@/components/SessionTester';
import Footer from "@/components/Footer";

const SessionTest = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <SessionTester />
      </div>
      <Footer />
    </div>
  );
};

export default SessionTest;