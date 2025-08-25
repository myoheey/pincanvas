
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dashboard } from '@/components/Dashboard';
import { useAuth } from '@/hooks/useAuth';
import { PinIcon, LayersIcon, ShareIcon, MessageCircleIcon, HeartIcon, LockIcon } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  console.log('Index component render:', { 
    loading, 
    hasUser: !!user, 
    userId: user?.id,
    currentUrl: window.location.href 
  });

  if (loading) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/80">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  // 로그인하지 않은 사용자를 위한 랜딩 페이지
  return (
    <div className="min-h-screen gradient-primary">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <PinIcon className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white">PinCanvas</h1>
          </div>
          <div className="space-x-2">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10"
              onClick={() => navigate('/auth')}
            >
              로그인
            </Button>
            <Button 
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => navigate('/auth')}
            >
              시작하기
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">
              아이디어를 시각적으로 <br />
              <span className="text-white/90">정리하고 공유하세요</span>
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              PinCanvas는 이미지 위에 핀을 추가하여 아이디어를 정리하고, 
              팀과 실시간으로 협업할 수 있는 시각적 협업 도구입니다.
            </p>
            <div className="text-center">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg"
                onClick={() => navigate('/auth')}
              >
                무료로 시작하기
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <PinIcon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white">스마트 핀 시스템</CardTitle>
                <CardDescription className="text-white/70">
                  이미지 위 어디든 클릭하여 핀을 추가하고 상세 정보를 기록하세요.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <LayersIcon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white">레이어 관리</CardTitle>
                <CardDescription className="text-white/70">
                  여러 레이어로 핀을 체계적으로 분류하고 관리할 수 있습니다.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <ShareIcon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white">실시간 공유</CardTitle>
                <CardDescription className="text-white/70">
                  링크 하나로 팀원들과 캔버스를 공유하고 함께 작업하세요.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <MessageCircleIcon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white">댓글 & 피드백</CardTitle>
                <CardDescription className="text-white/70">
                  각 핀에 댓글을 달아 팀원들과 소통하고 피드백을 주고받으세요.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <HeartIcon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white">좋아요 & 반응</CardTitle>
                <CardDescription className="text-white/70">
                  좋은 아이디어에 좋아요를 눌러 빠른 피드백을 제공하세요.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <LockIcon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white">권한 관리</CardTitle>
                <CardDescription className="text-white/70">
                  뷰어, 에디터 권한을 설정하여 안전하게 협업하세요.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-20 p-12 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/20">
            <h3 className="text-3xl font-bold text-white mb-4">
              지금 시작해보세요
            </h3>
            <p className="text-white/80 mb-8">
              회원가입은 무료이며, 바로 사용할 수 있습니다.
            </p>
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 px-12 py-4 text-lg"
              onClick={() => navigate('/auth')}
            >
              무료로 시작하기
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/20">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-white/60">
            © 2025 PinCanvas by Lena
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
