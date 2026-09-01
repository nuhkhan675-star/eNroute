export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admission_requirements: {
        Row: {
          created_at: string
          data_source_id: string | null
          data_year: number | null
          description: string
          id: string
          last_verified_at: string | null
          min_grade: string | null
          requirement_type: string
          subject_id: string | null
          university_program_id: string
        }
        Insert: {
          created_at?: string
          data_source_id?: string | null
          data_year?: number | null
          description: string
          id?: string
          last_verified_at?: string | null
          min_grade?: string | null
          requirement_type: string
          subject_id?: string | null
          university_program_id: string
        }
        Update: {
          created_at?: string
          data_source_id?: string | null
          data_year?: number | null
          description?: string
          id?: string
          last_verified_at?: string | null
          min_grade?: string | null
          requirement_type?: string
          subject_id?: string | null
          university_program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_requirements_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_requirements_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_requirements_university_program_id_fkey"
            columns: ["university_program_id"]
            isOneToOne: false
            referencedRelation: "university_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_statistics: {
        Row: {
          acceptance_rate: number | null
          admitted_count: number | null
          applicant_count: number | null
          avg_academic_metric: string | null
          confidence: string
          created_at: string
          data_source_id: string | null
          id: string
          international_acceptance_rate: number | null
          last_verified_at: string | null
          university_program_id: string
          year: number
        }
        Insert: {
          acceptance_rate?: number | null
          admitted_count?: number | null
          applicant_count?: number | null
          avg_academic_metric?: string | null
          confidence: string
          created_at?: string
          data_source_id?: string | null
          id?: string
          international_acceptance_rate?: number | null
          last_verified_at?: string | null
          university_program_id: string
          year: number
        }
        Update: {
          acceptance_rate?: number | null
          admitted_count?: number | null
          applicant_count?: number | null
          avg_academic_metric?: string | null
          confidence?: string
          created_at?: string
          data_source_id?: string | null
          id?: string
          international_acceptance_rate?: number | null
          last_verified_at?: string | null
          university_program_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "admission_statistics_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_statistics_university_program_id_fkey"
            columns: ["university_program_id"]
            isOneToOne: false
            referencedRelation: "university_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analyses: {
        Row: {
          analysis_type: string
          created_at: string
          id: string
          input_snapshot: Json
          model_used: string
          output: Json
          profile_id: string
          university_program_id: string | null
        }
        Insert: {
          analysis_type: string
          created_at?: string
          id?: string
          input_snapshot: Json
          model_used: string
          output: Json
          profile_id: string
          university_program_id?: string | null
        }
        Update: {
          analysis_type?: string
          created_at?: string
          id?: string
          input_snapshot?: Json
          model_used?: string
          output?: Json
          profile_id?: string
          university_program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analyses_university_program_id_fkey"
            columns: ["university_program_id"]
            isOneToOne: false
            referencedRelation: "university_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          referenced_analysis_ids: string[] | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          referenced_analysis_ids?: string[] | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          referenced_analysis_ids?: string[] | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string
          id: string
          iso_code: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          iso_code: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          iso_code?: string
          name?: string
        }
        Relationships: []
      }
      curricula: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          created_at: string
          id: string
          name: string
          reliability_tier: string
          source_type: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          reliability_tier: string
          source_type: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          reliability_tier?: string
          source_type?: string
          url?: string | null
        }
        Relationships: []
      }
      deadlines: {
        Row: {
          applicant_type: string | null
          created_at: string
          data_source_id: string | null
          date: string | null
          deadline_type: string
          id: string
          last_verified_at: string | null
          notes: string | null
          university_program_id: string
        }
        Insert: {
          applicant_type?: string | null
          created_at?: string
          data_source_id?: string | null
          date?: string | null
          deadline_type: string
          id?: string
          last_verified_at?: string | null
          notes?: string | null
          university_program_id: string
        }
        Update: {
          applicant_type?: string | null
          created_at?: string
          data_source_id?: string | null
          date?: string | null
          deadline_type?: string
          id?: string
          last_verified_at?: string | null
          notes?: string | null
          university_program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_university_program_id_fkey"
            columns: ["university_program_id"]
            isOneToOne: false
            referencedRelation: "university_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_scores: {
        Row: {
          created_at: string
          exam_type: string
          id: string
          profile_id: string
          score: string
        }
        Insert: {
          created_at?: string
          exam_type: string
          id?: string
          profile_id: string
          score: string
        }
        Update: {
          created_at?: string
          exam_type?: string
          id?: string
          profile_id?: string
          score?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_scores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      extracurriculars: {
        Row: {
          achievements: string | null
          activity_name: string
          category: string
          created_at: string
          description: string | null
          id: string
          impact: string | null
          profile_id: string
          role: string | null
          updated_at: string
          years_involved: number | null
        }
        Insert: {
          achievements?: string | null
          activity_name: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          profile_id: string
          role?: string | null
          updated_at?: string
          years_involved?: number | null
        }
        Update: {
          achievements?: string | null
          activity_name?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          profile_id?: string
          role?: string | null
          updated_at?: string
          years_involved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extracurriculars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_categories: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          parent_group: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          parent_group: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          parent_group?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          category_id: string
          created_at: string
          degree_level: string
          id: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          degree_level: string
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          degree_level?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "program_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarships: {
        Row: {
          amount: number | null
          amount_type: string
          created_at: string
          currency: string | null
          data_source_id: string | null
          deadline: string | null
          eligibility_structured: Json | null
          eligibility_text: string | null
          id: string
          last_verified_at: string | null
          name: string
          university_id: string
          university_program_id: string | null
        }
        Insert: {
          amount?: number | null
          amount_type: string
          created_at?: string
          currency?: string | null
          data_source_id?: string | null
          deadline?: string | null
          eligibility_structured?: Json | null
          eligibility_text?: string | null
          id?: string
          last_verified_at?: string | null
          name: string
          university_id: string
          university_program_id?: string | null
        }
        Update: {
          amount?: number | null
          amount_type?: string
          created_at?: string
          currency?: string | null
          data_source_id?: string | null
          deadline?: string | null
          eligibility_structured?: Json | null
          eligibility_text?: string | null
          id?: string
          last_verified_at?: string | null
          name?: string
          university_id?: string
          university_program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarships_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarships_university_program_id_fkey"
            columns: ["university_program_id"]
            isOneToOne: false
            referencedRelation: "university_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      student_countries: {
        Row: {
          country_id: string
          profile_id: string
        }
        Insert: {
          country_id: string
          profile_id: string
        }
        Update: {
          country_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_countries_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_countries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          created_at: string
          curriculum_id: string | null
          id: string
          intended_program_category_id: string | null
          onboarding_completed_at: string | null
          profile_strength: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          curriculum_id?: string | null
          id?: string
          intended_program_category_id?: string | null
          onboarding_completed_at?: string | null
          profile_strength?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          curriculum_id?: string | null
          id?: string
          intended_program_category_id?: string | null
          onboarding_completed_at?: string | null
          profile_strength?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_intended_program_category_id_fkey"
            columns: ["intended_program_category_id"]
            isOneToOne: false
            referencedRelation: "program_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subjects: {
        Row: {
          created_at: string
          grade: string
          id: string
          level: string | null
          profile_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          level?: string | null
          profile_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          level?: string | null
          profile_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          available_levels: string[]
          created_at: string
          curriculum_id: string
          grade_scale: string
          id: string
          name: string
        }
        Insert: {
          available_levels?: string[]
          created_at?: string
          curriculum_id: string
          grade_scale: string
          id?: string
          name: string
        }
        Update: {
          available_levels?: string[]
          created_at?: string
          curriculum_id?: string
          grade_scale?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      tuition: {
        Row: {
          created_at: string
          currency: string
          data_source_id: string | null
          domestic_amount: number | null
          id: string
          international_amount: number | null
          last_verified_at: string | null
          university_program_id: string
          year: number
        }
        Insert: {
          created_at?: string
          currency: string
          data_source_id?: string | null
          domestic_amount?: number | null
          id?: string
          international_amount?: number | null
          last_verified_at?: string | null
          university_program_id: string
          year: number
        }
        Update: {
          created_at?: string
          currency?: string
          data_source_id?: string | null
          domestic_amount?: number | null
          id?: string
          international_amount?: number | null
          last_verified_at?: string | null
          university_program_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tuition_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_university_program_id_fkey"
            columns: ["university_program_id"]
            isOneToOne: false
            referencedRelation: "university_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          city: string | null
          country_id: string
          created_at: string
          data_source_id: string | null
          data_year: number | null
          description: string | null
          id: string
          last_verified_at: string | null
          name: string
          photo_attribution: string | null
          photo_url: string | null
          university_type: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          country_id: string
          created_at?: string
          data_source_id?: string | null
          data_year?: number | null
          description?: string | null
          id?: string
          last_verified_at?: string | null
          name: string
          photo_attribution?: string | null
          photo_url?: string | null
          university_type?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          country_id?: string
          created_at?: string
          data_source_id?: string | null
          data_year?: number | null
          description?: string | null
          id?: string
          last_verified_at?: string | null
          name?: string
          photo_attribution?: string | null
          photo_url?: string | null
          university_type?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "universities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universities_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      university_programs: {
        Row: {
          campus: string | null
          created_at: string
          data_source_id: string | null
          data_year: number | null
          degree_level: string
          delivery_mode: string | null
          display_name: string
          duration_years: number | null
          faculty: string | null
          id: string
          last_verified_at: string | null
          official_url: string | null
          overview: string | null
          program_id: string
          university_id: string
          updated_at: string
        }
        Insert: {
          campus?: string | null
          created_at?: string
          data_source_id?: string | null
          data_year?: number | null
          degree_level: string
          delivery_mode?: string | null
          display_name: string
          duration_years?: number | null
          faculty?: string | null
          id?: string
          last_verified_at?: string | null
          official_url?: string | null
          overview?: string | null
          program_id: string
          university_id: string
          updated_at?: string
        }
        Update: {
          campus?: string | null
          created_at?: string
          data_source_id?: string | null
          data_year?: number | null
          degree_level?: string
          delivery_mode?: string | null
          display_name?: string
          duration_years?: number | null
          faculty?: string | null
          id?: string
          last_verified_at?: string | null
          official_url?: string | null
          overview?: string | null
          program_id?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_programs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_programs_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      university_rankings: {
        Row: {
          created_at: string
          id: string
          last_verified_at: string | null
          ranking_org: string
          ranking_type: string
          ranking_value: number
          ranking_year: number
          source_url: string | null
          subject_category_id: string | null
          university_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_verified_at?: string | null
          ranking_org: string
          ranking_type: string
          ranking_value: number
          ranking_year: number
          source_url?: string | null
          subject_category_id?: string | null
          university_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_verified_at?: string | null
          ranking_org?: string
          ranking_type?: string
          ranking_value?: number
          ranking_year?: number
          source_url?: string | null
          subject_category_id?: string | null
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_rankings_subject_category_id_fkey"
            columns: ["subject_category_id"]
            isOneToOne: false
            referencedRelation: "program_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_rankings_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
