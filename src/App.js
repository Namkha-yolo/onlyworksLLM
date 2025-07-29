import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Camera, Target, TrendingUp, Clock, Award, AlertCircle, BarChart3, Brain, Key, Mouse, Monitor, Sparkles, Eye, Zap } from 'lucide-react';

const ProgressTracker = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [screenshots, setScreenshots] = useState([]);
  const [currentGoal, setCurrentGoal] = useState('Complete project documentation');
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [progressData, setProgressData] = useState({
    todayProgress: 0,
    weeklyProgress: 0,
    goalCompletion: 0,
    efficiency: 0
  });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLog, setAnalysisLog] = useState([]);
  const [captureStats, setCaptureStats] = useState({
    clicks: 0,
    keystrokes: 0,
    windowChanges: 0
  });
  
  // Tracking variables
  const intervalRef = useRef(null);
  const streamRef = useRef(null);
  const keystrokeCountRef = useRef(0);
  const lastWindowTitleRef = useRef('');
  const isAnalyzingRef = useRef(false);

  // Timer effect
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRecording]);

  // Event listeners for capture triggers
  useEffect(() => {
    if (isRecording && streamRef.current) {
      // Set up periodic screenshot capture since we can't reliably detect cross-app activity
      const periodicCapture = setInterval(() => {
        console.log('Periodic screenshot capture triggered');
        triggerScreenshot('periodic');
      }, 30000); // Every 30 seconds

      const handleClick = (e) => {
        console.log('Click detected within app:', e.target);
        setCaptureStats(prev => ({ ...prev, clicks: prev.clicks + 1 }));
        triggerScreenshot('click');
      };

      const handleKeydown = (e) => {
        const isCharacterKey = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
        const isAllowedKey = ['Backspace', 'Delete', 'Enter', 'Tab', 'Space'].includes(e.key);
        
        if (isCharacterKey || isAllowedKey) {
          keystrokeCountRef.current++;
          console.log('Valid keystroke detected in app:', e.key, 'Total:', keystrokeCountRef.current);
          setCaptureStats(prev => ({ ...prev, keystrokes: prev.keystrokes + 1 }));
          
          if (keystrokeCountRef.current >= 20) {
            console.log('Triggering keystroke screenshot at count:', keystrokeCountRef.current);
            keystrokeCountRef.current = 0;
            triggerScreenshot('keystrokes');
          }
        }
      };

      const handleWindowFocus = () => {
        console.log('Window gained focus - user returned to app');
        setCaptureStats(prev => ({ ...prev, windowChanges: prev.windowChanges + 1 }));
        triggerScreenshot('focus_return');
      };

      const handleWindowBlur = () => {
        console.log('Window lost focus - user switched away');
        setCaptureStats(prev => ({ ...prev, windowChanges: prev.windowChanges + 1 }));
        triggerScreenshot('focus_leave');
      };

      const handleVisibilityChange = () => {
        if (document.hidden) {
          console.log('Tab became hidden');
          setCaptureStats(prev => ({ ...prev, windowChanges: prev.windowChanges + 1 }));
          triggerScreenshot('tab_hidden');
        } else {
          console.log('Tab became visible');
          setCaptureStats(prev => ({ ...prev, windowChanges: prev.windowChanges + 1 }));
          triggerScreenshot('tab_visible');
        }
      };

      // Add listeners
      document.addEventListener('click', handleClick, true);
      document.addEventListener('keydown', handleKeydown, true);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleWindowFocus);
      window.addEventListener('blur', handleWindowBlur);

      return () => {
        clearInterval(periodicCapture);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeydown, true);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleWindowFocus);
        window.removeEventListener('blur', handleWindowBlur);
      };
    }
  }, [isRecording]);

  const triggerScreenshot = useCallback(async (trigger) => {
    if (!streamRef.current || isAnalyzingRef.current) return;
    
    try {
      const canvas = document.createElement('canvas');
      const video = document.createElement('video');
      video.srcObject = streamRef.current;
      
      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
        video.play();
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Convert to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });
      
      const timestamp = new Date().toLocaleTimeString();
      const imageUrl = URL.createObjectURL(blob);
      
      const newScreenshot = {
        id: Date.now(),
        timestamp,
        url: imageUrl,
        blob: blob,
        trigger: trigger,
        analyzed: false
      };
      
      console.log('Screenshot captured:', trigger, newScreenshot);
      setScreenshots(prev => [...prev, newScreenshot]);
      
      if (isApiKeySet) {
        await analyzeScreenshotWithAI(newScreenshot);
      }
        
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      // Add failed capture to log
      setAnalysisLog(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        trigger: trigger,
        productivity: 0,
        activity: 'Capture Failed',
        insights: ['Screenshot capture failed: ' + error.message],
        error: error.message
      }]);
    }
  }, [isApiKeySet]);

  const analyzeScreenshotWithAI = async (screenshot) => {
    if (isAnalyzingRef.current) return;
    
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);

    try {
      console.log('Starting AI analysis for screenshot:', screenshot.id);
      
      // Convert blob to base64
      const base64 = await blobToBase64(screenshot.blob);
      console.log('Base64 conversion complete, length:', base64.length);
      
      // Call OpenAI Vision API
      const analysis = await callOpenAIVision(base64, currentGoal);
      console.log('AI analysis complete:', analysis);
      
      // Update screenshot with AI analysis
      setScreenshots(prev => prev.map(s => 
        s.id === screenshot.id 
          ? { ...s, analyzed: true, aiAnalysis: analysis }
          : s
      ));

      // Add to analysis log
      setAnalysisLog(prev => [...prev, {
        timestamp: screenshot.timestamp,
        trigger: screenshot.trigger,
        productivity: analysis.productivityScore,
        activity: analysis.activity,
        insights: analysis.insights,
        fullAnalysis: analysis
      }]);

    } catch (error) {
      console.error('AI analysis failed:', error);
      console.error('Error details:', error.message, error.stack);
      
      setAnalysisLog(prev => [...prev, {
        timestamp: screenshot.timestamp,
        trigger: screenshot.trigger,
        productivity: 0,
        activity: 'Analysis Failed',
        insights: ['AI analysis failed: ' + error.message],
        error: error.message
      }]);
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  };

  const callOpenAIVision = async (base64Image, goal) => {
    try {
      console.log('Calling OpenAI API with model: gpt-4o');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Updated to current model
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this work session screenshot. The user's goal is: "${goal}". 
                  
                  Please provide analysis in this exact JSON format:
                  {
                    "productivityScore": <number 0-100>,
                    "activity": "<activity type>",
                    "insights": ["<insight 1>", "<insight 2>"],
                    "focusLevel": <number 0-100>,
                    "distractions": ["<distraction 1>", "<distraction 2>"],
                    "goalAlignment": <number 0-100>,
                    "recommendations": ["<recommendation 1>", "<recommendation 2>"],
                    "applications": ["<app 1>", "<app 2>"],
                    "timeOfDay": "<morning/afternoon/evening>",
                    "workPattern": "<description>"
                  }
                  
                  Score based on:
                  - How focused the work appears
                  - Alignment with stated goal
                  - Evidence of productive activity
                  - Presence of distractions
                  - Application usage patterns`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        })
      });

      console.log('OpenAI API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenAI API response data:', data);
      
      const content = data.choices[0].message.content;
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
      }
      
      return parseAIResponse(content);
      
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  };

  const parseAIResponse = (content) => {
    return {
      productivityScore: extractNumber(content, 'productivity') || 50,
      activity: extractActivity(content) || 'General Work',
      insights: extractInsights(content) || ['AI analysis completed'],
      focusLevel: extractNumber(content, 'focus') || 50,
      distractions: extractDistractions(content) || [],
      goalAlignment: extractNumber(content, 'goal') || 50,
      recommendations: extractRecommendations(content) || [],
      applications: extractApplications(content) || [],
      timeOfDay: extractTimeOfDay(),
      workPattern: 'Analysis in progress'
    };
  };

  const extractNumber = (text, keyword) => {
    const regex = new RegExp(`${keyword}[:\\s]*([0-9]{1,3})`, 'i');
    const match = text.match(regex);
    return match ? parseInt(match[1]) : null;
  };

  const extractActivity = (text) => {
    const activities = ['coding', 'writing', 'research', 'communication', 'design', 'planning'];
    const found = activities.find(activity => 
      text.toLowerCase().includes(activity)
    );
    return found ? found.charAt(0).toUpperCase() + found.slice(1) : 'General Work';
  };

  const extractInsights = (text) => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).map(s => s.trim());
  };

  const extractDistractions = (text) => {
    const commonDistractions = ['social media', 'email', 'notifications', 'multiple tabs'];
    return commonDistractions.filter(d => text.toLowerCase().includes(d));
  };

  const extractRecommendations = (text) => {
    const sentences = text.split(/[.!?]+/).filter(s => 
      s.toLowerCase().includes('recommend') || 
      s.toLowerCase().includes('suggest') ||
      s.toLowerCase().includes('should')
    );
    return sentences.slice(0, 2).map(s => s.trim());
  };

  const extractApplications = (text) => {
    const commonApps = ['chrome', 'vscode', 'slack', 'word', 'excel', 'figma', 'notion'];
    return commonApps.filter(app => text.toLowerCase().includes(app));
  };

  const extractTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 2 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsRecording(false);
        endSession();
      });

      return true;
    } catch (error) {
      console.error('Screen sharing failed:', error);
      alert('Screen sharing permission required for progress tracking');
      return false;
    }
  };

  const toggleRecording = async () => {
    if (!isApiKeySet) {
      alert('Please set your OpenAI API key first');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      endSession();
    } else {
      const screenShareStarted = await startScreenShare();
      if (screenShareStarted) {
        setIsRecording(true);
        setSessionTime(0);
        setScreenshots([]);
        setAnalysisLog([]);
        setCaptureStats({ clicks: 0, keystrokes: 0, windowChanges: 0 });
        keystrokeCountRef.current = 0;
      }
    }
  };

  const endSession = async () => {
    const session = {
      id: Date.now(),
      duration: sessionTime,
      screenshots: screenshots.length,
      timestamp: new Date().toLocaleString(),
      goal: currentGoal,
      analysisData: analysisLog,
      captureStats: captureStats
    };
    
    setSessions(prev => [...prev, session]);
    await performFinalAnalysis(session);
  };

  const performFinalAnalysis = async (session) => {
    if (analysisLog.length === 0) return;

    const validAnalyses = analysisLog.filter(log => !log.error);
    if (validAnalyses.length === 0) return;

    const avgProductivity = validAnalyses.reduce((sum, log) => sum + log.productivity, 0) / validAnalyses.length;
    const avgFocus = validAnalyses.reduce((sum, log) => sum + (log.fullAnalysis?.focusLevel || 50), 0) / validAnalyses.length;
    const avgGoalAlignment = validAnalyses.reduce((sum, log) => sum + (log.fullAnalysis?.goalAlignment || 50), 0) / validAnalyses.length;

    const activityBreakdown = validAnalyses.reduce((acc, log) => {
      acc[log.activity] = (acc[log.activity] || 0) + 1;
      return acc;
    }, {});

    const allInsights = validAnalyses.flatMap(log => log.insights || []);
    const allRecommendations = validAnalyses.flatMap(log => log.fullAnalysis?.recommendations || []);

    const finalAnalysis = {
      efficiency: Math.round(avgProductivity),
      focusScore: Math.round(avgFocus),
      goalProgress: Math.round(avgGoalAlignment),
      insights: [...new Set(allInsights)].slice(0, 5),
      recommendations: [...new Set(allRecommendations)].slice(0, 5),
      nextSteps: generateNextSteps(currentGoal, avgProductivity),
      activityBreakdown,
      sessionSummary: `Analyzed ${validAnalyses.length} AI insights with ${Math.round(avgProductivity)}% average productivity`,
      captureBreakdown: captureStats
    };

    setAiAnalysis(finalAnalysis);
    
    setProgressData(prev => ({
      todayProgress: Math.min(prev.todayProgress + (session.duration / 480) * 100, 100),
      weeklyProgress: Math.min(prev.weeklyProgress + (session.duration / 2400) * 100, 100),
      goalCompletion: finalAnalysis.goalProgress,
      efficiency: finalAnalysis.efficiency
    }));
  };

  const generateNextSteps = (goal, productivity) => {
    const steps = [];
    
    if (productivity > 80) {
      steps.push('Maintain current high productivity momentum');
      steps.push('Consider documenting successful work patterns');
    } else if (productivity > 60) {
      steps.push('Identify peak productivity periods for important tasks');
      steps.push('Minimize context switching during focused work');
    } else {
      steps.push('Review and eliminate key productivity blockers');
      steps.push('Consider shorter, more focused work sessions');
    }

    if (goal.toLowerCase().includes('documentation')) {
      steps.push('Continue systematic documentation approach');
    } else if (goal.toLowerCase().includes('code')) {
      steps.push('Plan next development milestones');
    }

    return steps;
  };

  const handleApiKeySubmit = () => {
    if (apiKey.trim().startsWith('sk-')) {
      setIsApiKeySet(true);
    } else {
      alert('Please enter a valid OpenAI API key (starts with sk-)');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // API Key Setup Screen
  if (!isApiKeySet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-purple-500/5 to-blue-500/5 rounded-full blur-3xl animate-spin-slow"></div>
        </div>
        
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">
                  AI Vision Setup
                </h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Unlock the power of real-time AI analysis with OpenAI's Vision API
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 pointer-events-none"></div>
                </div>
                
                <button
                  onClick={handleApiKeySubmit}
                  className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Launch AI Analysis
                  </span>
                </button>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-gray-400 text-xs">
                  Get your API key from{' '}
                  <span className="text-purple-300 font-medium">platform.openai.com/api-keys</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/40 to-slate-900"></div>
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-lg">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-blue-300 to-purple-300">
              NeuroTracker
            </h1>
          </div>
          <p className="text-xl text-gray-300 font-light">Real-time AI Vision Analysis • Intelligent Productivity Insights</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-purple-300">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Powered by OpenAI GPT-4 Vision</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Control Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    Live AI Session
                  </h2>
                  <div className="flex items-center gap-4 text-gray-300">
                    <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-mono">{formatTime(sessionTime)}</span>
                    </div>
                    {isAnalyzing && (
                      <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-2">
                        <Brain className="w-4 h-4 animate-pulse text-blue-400" />
                        <span className="text-sm text-blue-300">AI Processing...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Goal Input */}
                <div className="mb-8">
                  <label className="block text-gray-300 text-sm font-medium mb-3">
                    Session Goal
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={currentGoal}
                      onChange={(e) => setCurrentGoal(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 text-lg"
                      placeholder="What are you working on today?"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 pointer-events-none"></div>
                  </div>
                </div>

                {/* Recording Button */}
                <div className="flex justify-center mb-8">
                  <button
                    onClick={toggleRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold transition-all duration-500 transform hover:scale-110 shadow-2xl relative overflow-hidden ${
                      isRecording 
                        ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/50' 
                        : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-500/50'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
                    <div className="relative z-10">
                      {isRecording ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
                    </div>
                    {isRecording && (
                      <div className="absolute inset-0 rounded-full animate-ping bg-red-400/30"></div>
                    )}
                  </button>
                </div>

                {/* Capture Triggers */}
                {isRecording && (
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl p-6 text-center backdrop-blur-sm transform hover:scale-105 transition-all duration-300">
                      <Mouse className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                      <div className="text-3xl font-bold text-white mb-1">{captureStats.clicks}</div>
                      <div className="text-blue-200 text-sm font-medium">Total Clicks</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl p-6 text-center backdrop-blur-sm transform hover:scale-105 transition-all duration-300">
                      <Key className="w-8 h-8 text-green-400 mx-auto mb-3" />
                      <div className="text-3xl font-bold text-white mb-1">{captureStats.keystrokes}</div>
                      <div className="text-green-200 text-sm font-medium">Keystrokes ({Math.floor(captureStats.keystrokes / 20)} captures)</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-6 text-center backdrop-blur-sm transform hover:scale-105 transition-all duration-300">
                      <Monitor className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                      <div className="text-3xl font-bold text-white mb-1">{captureStats.windowChanges}</div>
                      <div className="text-purple-200 text-sm font-medium">Window Changes</div>
                    </div>
                  </div>
                )}

                {/* Live AI Analysis Feed */}
                {analysisLog.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      Real-time AI Analysis
                    </h3>
                    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6 max-h-80 overflow-y-auto space-y-4 custom-scrollbar">
                      {analysisLog.slice(-5).map((log, index) => (
                        <div key={index} className="bg-gradient-to-r from-white/10 to-white/5 border border-white/10 rounded-xl p-4 hover:from-white/15 hover:to-white/10 transition-all duration-300">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-white font-semibold">{log.activity}</span>
                              <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full font-medium">
                                {log.trigger}
                              </span>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              log.productivity > 80 
                                ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                              log.productivity > 60 
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                'bg-red-500/20 text-red-300 border-red-500/30'
                            }`}>
                              {log.productivity}%
                            </div>
                          </div>
                          {log.insights && log.insights.length > 0 && (
                            <div className="text-sm text-gray-300 mb-2">
                              {log.insights[0]}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {log.timestamp}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Progress Metrics */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
              
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  AI Progress Metrics
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span className="font-medium">Goal Completion</span>
                      <span className="font-bold text-white">{Math.round(progressData.goalCompletion)}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${progressData.goalCompletion}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span className="font-medium">AI Efficiency Score</span>
                      <span className="font-bold text-white">{Math.round(progressData.efficiency)}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 h-3 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${progressData.efficiency}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-4 border-t border-white/10">
                    <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300 mb-1">
                      {screenshots.length}
                    </div>
                    <div className="text-gray-400 text-sm font-medium">AI Screenshots Analyzed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis Results */}
            {aiAnalysis && (
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
                
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    OpenAI Session Analysis
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl">
                        <div className="text-3xl font-bold text-green-300 mb-1">{aiAnalysis.efficiency}%</div>
                        <div className="text-xs text-green-200 font-medium">Efficiency</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl">
                        <div className="text-3xl font-bold text-blue-300 mb-1">{aiAnalysis.focusScore}%</div>
                        <div className="text-xs text-blue-200 font-medium">Focus Score</div>
                      </div>
                    </div>

                    {aiAnalysis.sessionSummary && (
                      <div className="bg-gradient-to-r from-white/10 to-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="text-sm text-gray-200 leading-relaxed">{aiAnalysis.sessionSummary}</div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        AI Insights
                      </h4>
                      <ul className="space-y-2">
                        {aiAnalysis.insights?.slice(0, 3).map((insight, index) => (
                          <li key={index} className="flex items-start gap-3 text-sm text-gray-300">
                            <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="leading-relaxed">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        AI Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {aiAnalysis.recommendations?.slice(0, 3).map((rec, index) => (
                          <li key={index} className="flex items-start gap-3 text-sm text-gray-300">
                            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <span className="leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Session History */}
            {sessions.length > 0 && (
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
                
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white mb-4">AI Session History</h3>
                  <div className="space-y-3">
                    {sessions.slice(-3).map((session) => (
                      <div key={session.id} className="bg-gradient-to-r from-white/10 to-white/5 border border-white/10 rounded-xl p-4 hover:from-white/15 hover:to-white/10 transition-all duration-300">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm font-medium text-white truncate flex-1 pr-4">
                            {session.goal}
                          </div>
                          <div className="text-xs text-gray-400 font-mono bg-white/10 px-2 py-1 rounded">
                            {formatTime(session.duration)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>{session.timestamp}</span>
                          <div className="flex gap-3">
                            <span className="flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              {session.screenshots} analyses
                            </span>
                            <span className="flex items-center gap-1">
                              <Mouse className="w-3 h-3" />
                              {session.captureStats?.clicks || 0} clicks
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Screenshot Gallery */}
        {screenshots.length > 0 && (
          <div className="mt-12">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  AI Vision Gallery
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({screenshots.length} captures analyzed)
                  </span>
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {screenshots.slice(-24).map((screenshot) => (
                    <div key={screenshot.id} className="relative group cursor-pointer transform hover:scale-105 transition-all duration-300">
                      <img 
                        src={screenshot.url} 
                        alt="AI Analyzed Screenshot" 
                        className="w-full h-24 object-cover rounded-xl border border-white/20 shadow-lg group-hover:shadow-2xl transition-all duration-300"
                      />
                      
                      {/* Status indicator */}
                      <div className="absolute top-2 left-2">
                        <div className={`w-3 h-3 rounded-full border-2 border-white ${
                          screenshot.analyzed 
                            ? 'bg-green-400 shadow-green-400/50' 
                            : 'bg-yellow-400 animate-pulse shadow-yellow-400/50'
                        } shadow-lg`}></div>
                      </div>
                      
                      {/* Trigger badge */}
                      <div className="absolute top-2 right-2">
                        <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium border border-white/20">
                          {screenshot.trigger}
                        </div>
                      </div>
                      
                      {/* Timestamp */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full text-center font-mono border border-white/20">
                          {screenshot.timestamp}
                        </div>
                      </div>
                      
                      {/* AI Score */}
                      {screenshot.aiAnalysis && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <div className={`text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-lg ${
                            screenshot.aiAnalysis.productivityScore > 80 
                              ? 'bg-green-500 text-white shadow-green-500/50' :
                            screenshot.aiAnalysis.productivityScore > 60 
                              ? 'bg-yellow-500 text-black shadow-yellow-500/50' :
                              'bg-red-500 text-white shadow-red-500/50'
                          }`}>
                            {screenshot.aiAnalysis.productivityScore}%
                          </div>
                        </div>
                      )}
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-end">
                        <div className="p-2 text-white text-xs">
                          {screenshot.aiAnalysis?.activity || 'Processing...'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {screenshots.length > 24 && (
                  <div className="text-center mt-6">
                    <p className="text-gray-400 text-sm">
                      Showing latest 24 of {screenshots.length} captures
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Custom Global Styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
            opacity: 0.7;
          }
          50% { 
            transform: translateY(-20px) rotate(10deg); 
            opacity: 1;
          }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, rgba(139, 92, 246, 0.6), rgba(59, 130, 246, 0.6));
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, rgba(139, 92, 246, 0.8), rgba(59, 130, 246, 0.8));
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        ::selection {
          background: rgba(139, 92, 246, 0.3);
          color: white;
        }
        
        *:focus {
          outline: none;
        }
        
        input:focus, button:focus {
          ring: 2px solid rgba(139, 92, 246, 0.5);
          ring-offset: 2px;
          ring-offset-color: transparent;
        }
        
        .backdrop-blur-2xl {
          backdrop-filter: blur(40px) saturate(150%);
        }
        
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
        
        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .hover-lift:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .shimmer {
          position: relative;
          overflow: hidden;
        }
        
        .shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: shimmer 2s infinite;
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 1rem;
          }
          
          .grid-cols-8 {
            grid-template-columns: repeat(4, 1fr);
          }
          
          .grid-cols-6 {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .text-5xl {
            font-size: 2.5rem;
          }
          
          .text-3xl {
            font-size: 1.875rem;
          }
        }
        
        @media (max-width: 640px) {
          .grid-cols-4 {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .grid-cols-3 {
            grid-template-columns: repeat(1, 1fr);
          }
          
          .text-5xl {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressTracker;