import { createClient } from '@/lib/supabase/client';

export interface VoiceTranscriptionResult {
  transcription: string;
  confidence: number;
  language: string;
  duration: number;
  wordCount: number;
  keywords?: string[];
}

export interface VoiceAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  emotions: {
    emotion: string;
    confidence: number;
  }[];
  topics: string[];
  actionItems: string[];
  summary: string;
}

/**
 * Voice Transcription Service
 * Handles speech-to-text conversion and voice note analysis
 */
export const voiceTranscriptionService = {
  /**
   * Transcribe audio blob to text
   * In production, this would integrate with services like:
   * - OpenAI Whisper API
   * - Google Speech-to-Text
   * - AWS Transcribe
   * - Azure Speech Services
   */
  async transcribeAudio(audioBlob: Blob): Promise<VoiceTranscriptionResult> {
    try {
      // For now, we'll simulate transcription with a mock implementation
      // In production, you would send the audio to a transcription service

      const mockResult = await this.mockTranscription(audioBlob);

      // Store the transcription result for future reference
      await this.storeTranscriptionResult(mockResult);

      return mockResult;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio');
    }
  },

  /**
   * Analyze transcribed text for insights
   */
  async analyzeTranscription(transcription: string): Promise<VoiceAnalysisResult> {
    try {
      // In production, this would use NLP services like:
      // - OpenAI GPT for analysis
      // - Google Natural Language API
      // - AWS Comprehend
      // - Azure Text Analytics

      return this.mockAnalysis(transcription);
    } catch (error) {
      console.error('Error analyzing transcription:', error);
      throw new Error('Failed to analyze transcription');
    }
  },

  /**
   * Get transcription history for a user
   */
  async getTranscriptionHistory(userId: string, limit: number = 50): Promise<VoiceTranscriptionResult[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('voice_transcriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transcription history:', error);
      throw new Error('Failed to fetch transcription history');
    }

    return data || [];
  },

  /**
   * Search transcriptions by content
   */
  async searchTranscriptions(userId: string, query: string): Promise<VoiceTranscriptionResult[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('voice_transcriptions')
      .select('*')
      .eq('user_id', userId)
      .textSearch('transcription', query)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching transcriptions:', error);
      throw new Error('Failed to search transcriptions');
    }

    return data || [];
  },

  /**
   * Extract keywords from transcription
   */
  extractKeywords(transcription: string): string[] {
    // Simple keyword extraction
    const words = transcription.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Remove common stop words
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
      'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'
    ]);

    const keywords = words.filter(word => !stopWords.has(word));

    // Count frequency and return top keywords
    const frequency: Record<string, number> = {};
    keywords.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  },

  /**
   * Generate summary from transcription
   */
  generateSummary(transcription: string): string {
    // Simple summarization - in production, use AI services
    const sentences = transcription.split(/[.!?]+/).filter(s => s.trim().length > 10);

    if (sentences.length <= 3) {
      return transcription;
    }

    // Return first and last sentences as a simple summary
    const firstSentence = sentences[0].trim();
    const lastSentence = sentences[sentences.length - 1].trim();

    return `${firstSentence}. ... ${lastSentence}.`;
  },

  /**
   * Store transcription result in database
   */
  async storeTranscriptionResult(result: VoiceTranscriptionResult): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('voice_transcriptions')
      .insert({
        transcription: result.transcription,
        confidence: result.confidence,
        language: result.language,
        duration: result.duration,
        word_count: result.wordCount,
        keywords: result.keywords,
      });

    if (error) {
      console.error('Error storing transcription:', error);
    }
  },

  /**
   * Mock transcription for development/demo
   */
  async mockTranscription(audioBlob: Blob): Promise<VoiceTranscriptionResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockTranscriptions = [
      "I've been making great progress on my fitness goal this week. I managed to work out four times and I'm feeling much stronger. The main challenge I'm facing is finding time for longer cardio sessions, but I'm adapting by doing shorter, more intense workouts. I'm really proud of how consistent I've been and I can already see improvements in my endurance.",

      "This week has been tough for my learning goal. I only completed two out of the five lessons I planned to do. The main blocker is that I'm getting distracted by other priorities at work. However, I did have a breakthrough moment where the concepts finally clicked, so the quality of my learning has been good even if the quantity is less than planned.",

      "I'm reflecting on my goal journey so far and I realize that I've been too focused on the end result rather than enjoying the process. I want to shift my mindset to appreciate the small wins along the way. The daily habits I've built are actually more valuable than I initially thought, and I'm learning a lot about my own motivation patterns.",

      "For next week, I want to focus on breaking down my larger goal into smaller, more manageable tasks. I think I've been overwhelming myself by trying to do too much at once. My priority will be to establish a consistent morning routine that includes at least 30 minutes dedicated to my goal. I'll measure success by consistency rather than just outcomes."
    ];

    const randomTranscription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
    const keywords = this.extractKeywords(randomTranscription);

    return {
      transcription: randomTranscription,
      confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
      language: 'en-US',
      duration: audioBlob.size / 1000, // Rough estimate
      wordCount: randomTranscription.split(/\s+/).length,
      keywords
    };
  },

  /**
   * Mock analysis for development/demo
   */
  async mockAnalysis(transcription: string): Promise<VoiceAnalysisResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple sentiment analysis based on keywords
    const positiveWords = ['great', 'good', 'progress', 'proud', 'breakthrough', 'stronger', 'improvements'];
    const negativeWords = ['tough', 'challenge', 'blocker', 'difficult', 'struggle', 'overwhelming'];

    const words = transcription.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.some(pw => word.includes(pw))).length;
    const negativeCount = words.filter(word => negativeWords.some(nw => word.includes(nw))).length;

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    // Extract potential action items (sentences with future tense or modal verbs)
    const sentences = transcription.split(/[.!?]+/);
    const actionItems = sentences.filter(sentence =>
      /\b(will|want|plan|need|should|going to|next|tomorrow|week)\b/i.test(sentence)
    ).map(item => item.trim()).filter(item => item.length > 10);

    return {
      sentiment,
      emotions: [
        { emotion: 'confident', confidence: sentiment === 'positive' ? 0.8 : 0.3 },
        { emotion: 'determined', confidence: 0.6 },
        { emotion: 'reflective', confidence: 0.7 }
      ],
      topics: this.extractKeywords(transcription).slice(0, 5),
      actionItems: actionItems.slice(0, 3),
      summary: this.generateSummary(transcription)
    };
  }
};