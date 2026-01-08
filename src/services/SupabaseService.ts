import { createClient } from '@supabase/supabase-js';
import { formatDateString, hashSha1, logMethod } from '../utils.ts';

export interface EditModel {
  id?: string;
  title: string;
  description: string;
}

export interface ViewModel {
  id: string;
  title: string;
  preview_url: string;
  owner_id: string;
  username?: string;
  description?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  likes?: number;
  comments?: number;
}

export interface ViewModelDetails extends ViewModel {
  source_code: string;
  source_code_hash: string;
}

export interface ViewModelComment {
  id: string;
  model_id: string;
  user_id: string;
  username: string;
  body: string;
  created_at: string;
}

export interface ViewModelFilterCriteria {
  tag?: string;
  author?: string;
  searchTerm?: string;
  likedByUsername?: string;
  commentedByUsername?: string;
}

export interface UserStats {
  id: string;
  username?: string;
  avatar_url?: string;
  created_at?: string;
  last_sign_in_at?: string;
  models_count: number;
  likes_count: number;
  comments_count: number;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetch models, optionally filtered by tag, author, search term, likedByUsername, or commentedByUsername, with pagination and total count.
 * @param filter Filter criteria (tag, author, searchTerm, likedByUsername, commentedByUsername)
 * @param first Index of the first item to return (0-based)
 * @param limit Number of items to return
 * @returns { models: ViewModel[], total: number }
 */
export class SupabaseService {
  static fetchModels = logMethod(async function fetchModels(
    filter: ViewModelFilterCriteria = {},
    first: number = 0,
    limit: number = 20,
  ): Promise<{ models: ViewModel[]; total: number }> {
    const { tag, author, searchTerm, likedByUsername, commentedByUsername } = filter;
    const normTag = tag ? tag.toLowerCase().replace(/[^a-z0-9-]/g, '') : undefined;
    const normAuthor = author ? author.toLowerCase().replace(/[^a-z0-9-]/g, '') : undefined;
    const normSearch = searchTerm ? searchTerm.trim().toLowerCase() : undefined;

    // Pre-fetch model IDs for likedByUsername and commentedByUsername filters
    let likedModelIds: string[] | undefined;
    let commentedModelIds: string[] | undefined;
    if (likedByUsername) {
      likedModelIds = await SupabaseService.fetchLikedModelIdsByUsername(likedByUsername);
      if (likedModelIds.length === 0) {
        return { models: [], total: 0 };
      }
    }
    if (commentedByUsername) {
      commentedModelIds =
        await SupabaseService.fetchCommentedModelIdsByUsername(commentedByUsername);
      if (commentedModelIds.length === 0) {
        return { models: [], total: 0 };
      }
    }

    // Build filter conditions
    let countQuery = supabase.from('models').select('id', { count: 'exact', head: true });
    let query = supabase
      .from('models')
      .select(
        `id, title, preview_url, \
        owner_id, users!models_owner_id_fkey1(username), \
        description, tags, created_at, updated_at,\
        model_likes(count),\
        model_comments(count)`,
      )
      .order('created_at', { ascending: false });

    if (normTag) {
      countQuery = countQuery.contains('tags', [normTag]);
      query = query.contains('tags', [normTag]);
    }
    if (normAuthor) {
      countQuery = countQuery.ilike('username', normAuthor);
      query = query.ilike('username', normAuthor);
    }
    if (normSearch) {
      // Filter by searchTerm in title, description, or username
      const orFilter = [
        `title.ilike.%${normSearch}%`,
        `description.ilike.%${normSearch}%`,
        `username.ilike.%${normSearch}%`,
      ].join(',');
      countQuery = countQuery.or(orFilter);
      query = query.or(orFilter);
    }
    if (likedModelIds) {
      countQuery = countQuery.in('id', likedModelIds);
      query = query.in('id', likedModelIds);
    }
    if (commentedModelIds) {
      countQuery = countQuery.in('id', commentedModelIds);
      query = query.in('id', commentedModelIds);
    }
    query = query.range(first, first + limit - 1);

    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error('Error fetching model count:', countError);
      return { models: [], total: 0 };
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching models:', error);
      return { models: [], total: count ?? 0 };
    }
    if (!data) {
      console.debug('No models found.');
      return { models: [], total: count ?? 0 };
    }
    const models = (data as any[]).map((m) => ({
      ...m,
      username: m.users && Array.isArray(m.users) ? m.users[0]?.username : m.users?.username,
      created_at: formatDateString(m.created_at),
      updated_at: formatDateString(m.updated_at),
      likes: m.model_likes?.[0]?.count ?? 0,
      comments: m.model_comments?.[0]?.count ?? 0,
      users: undefined, // Remove users property if present
    }));
    return { models, total: count ?? models.length };
  }, 'SupabaseService');

  static fetchModelComments = logMethod(async function fetchModelComments(
    modelId: string,
  ): Promise<ViewModelComment[]> {
    const { data, error } = await supabase
      .from('model_comments')
      .select('id, model_id, user_id, users(username), body, created_at')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return (data as any[]).map(
      (m): ViewModelComment => ({
        ...m,
        username: m.users && Array.isArray(m.users) ? m.users[0]?.username : m.users?.username,
        created_at: formatDateString(m.created_at),
        users: undefined, // Remove users property if present
      }),
    );
  }, 'SupabaseService');

  /**
   * Generates a human-readable random ID of specified length (default 8).
   * Uses uppercase, lowercase letters, and digits.
   */
  static generateBase64Id = logMethod(function generateBase64Id(length): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, 'SupabaseService');

  /**
   * Uploads a model
   * @param previewImage The preview image file to upload, must be a WebP image.
   * @param editorContent source code of the model in the editor
   * @param modelData The model data
   * @returns The inserted model row
   */
  static uploadModel = logMethod(async function uploadModel(
    previewImage: File,
    editorContent: string,
    modelData: EditModel,
  ): Promise<void> {
    // Parse tags from editorContent: find all #tags, normalize to lowercase, allow only alphanumeric and minus
    const tagSet = new Set<string>();
    const tagRegex = /#([a-zA-Z0-9\-]+)/g;
    let match;
    while ((match = tagRegex.exec(modelData.description)) !== null) {
      const tag = match[1].toLowerCase().replace(/[^a-z0-9\-]/g, '');
      if (tag) tagSet.add(tag);
    }
    const parsedTags = Array.from(tagSet).slice(0, 10);

    // Get username from auth
    const user = (await supabase.auth.getUser()).data.user;
    const user_id = user?.id;
    const username =
      user?.user_metadata?.user_name || user?.user_metadata?.name || user?.email || null;

    let id: string | undefined = modelData.id;
    if (id === undefined) {
      let attempts = 0;
      while (attempts < 5) {
        const candidate = SupabaseService.generateBase64Id(8);
        const existingModel = await supabase.from('models').select('id').eq('id', candidate);
        if (existingModel.error) {
          console.error('Error finding new id for model:', modelData, existingModel.error);
          throw existingModel.error;
        }
        if (existingModel.data.length == 0) {
          id = candidate;
          break;
        }
        attempts++;
      }
    }
    if (!id) {
      throw new Error('Failed to generate a unique model ID after 5 attempts.');
    }
    // Upload preview image
    const filePath = `${id}.webp`;
    const previewUploadResult = await supabase.storage
      .from('previews')
      .upload(filePath, previewImage, { upsert: true });
    if (previewUploadResult.error) {
      console.error('Error uploading preview image:', previewImage, previewUploadResult.error);
      throw previewUploadResult.error;
    }
    const publicUrlResult = supabase.storage
      .from('previews')
      .getPublicUrl(previewUploadResult.data.path);
    // Upload model data
    const { data, error } = await supabase
      .from('models')
      .upsert([
        {
          id,
          title: modelData.title.substring(0, 100),
          description: modelData.description.substring(0, 2000),
          owner_id: user_id,
          username, // denormalized username
          source_code: editorContent,
          source_code_hash: await hashSha1(editorContent),
          tags: parsedTags,
          preview_url: publicUrlResult.data.publicUrl,
        },
      ])
      .select()
      .single();
    if (error) {
      console.error('Error uploading model:', modelData, error);
      await supabase.storage.from('models').remove([filePath]);
      throw error;
    }
  }, 'SupabaseService');

  /**
   * Fetch a single model by id, with all fields and formatted dates.
   */
  static fetchModelById = logMethod(async function fetchModelById(
    id: string | undefined,
  ): Promise<ViewModelDetails | undefined> {
    if (!id) return undefined;
    const { data, error } = await supabase
      .from('models')
      .select(
        `id, title, preview_url,\n      owner_id, users!models_owner_id_fkey1(username),\n      description, tags, created_at, updated_at,\n      model_likes(count),\n      model_comments(count),\n      source_code,\n      source_code_hash`,
      )
      .eq('id', id)
      .single();
    if (error || !data) {
      console.error('Error fetching model:', error);
      return undefined;
    }
    const model = data as any;
    return {
      ...model,
      username:
        model.users && Array.isArray(model.users) ?
          model.users[0]?.username
        : model.users?.username,
      created_at: formatDateString(model.created_at),
      updated_at: formatDateString(model.updated_at),
      likes: model.model_likes?.[0]?.count ?? 0,
      comments: model.model_comments?.[0]?.count ?? 0,
      users: undefined, // Remove users property if present
    };
  }, 'SupabaseService');

  /**
   * Fetch the source code for a model by id.
   * @param id Model id
   * @returns ViewModelSource or undefined if not found
   */
  static fetchModelSource = logMethod(async function fetchModelSource(
    id?: string,
  ): Promise<string | undefined> {
    if (!id) return undefined;
    const { data, error } = await supabase
      .from('models')
      .select('id, source_code')
      .eq('id', id)
      .single();
    if (error || !data) {
      console.error('Error fetching model source:', error);
      return undefined;
    }
    return data.source_code;
  }, 'SupabaseService');

  /**
   * Add a like for a model by a user. Returns true if successful, false if already liked.
   */
  static updateModelLike = logMethod(async function updateModelLike(
    model_id: string,
    value: boolean,
  ): Promise<boolean> {
    const user_id = (await supabase.auth.getUser()).data.user?.id;
    let result;
    if (value) {
      result = await supabase.from('model_likes').upsert([{ model_id, user_id }]);
    } else {
      result = await supabase
        .from('model_likes')
        .delete()
        .eq('model_id', model_id)
        .eq('user_id', user_id);
    }
    if (!result.error) return true;
    // If error is unique violation, treat as already liked (not a failure)
    if (
      result.error.code === '23505'
      || (result.error.message && result.error.message.includes('duplicate key'))
    ) {
      return false;
    }
    console.error('Error adding like:', result.error);
    throw result.error;
  }, 'SupabaseService');

  /**
   * Add a comment to a model. Returns the inserted comment or throws on error.
   */
  static addModelComment = logMethod(async function addModelComment(
    model_id: string | undefined,
    body: string,
  ): Promise<ViewModelComment> {
    if (!model_id)
      throw new Error(
        'Model ID must be specified when adding a comment. '
          + 'Make sure you are passing the model ID from the fetchModelById() function.',
      );
    const user_id = (await supabase.auth.getUser()).data.user?.id;
    if (!body.trim()) throw new Error('Comment body must not be empty.');
    const { data, error } = await supabase
      .from('model_comments')
      .insert([{ model_id, user_id, body: body.substring(0, 2000) }])
      .select()
      .single();
    if (error || !data) {
      console.error('Error adding comment:', error);
      throw error;
    }
    return {
      ...data,
    };
  }, 'SupabaseService');

  static fetchUserStats = logMethod(async function fetchUserStats(id: string): Promise<UserStats> {
    const { data, error } = await supabase
      .from('user_stats')
      .select(
        `\n      id,\n      username,\n      avatar_url,\n      created_at,\n      last_sign_in_at,\n      models_count,\n      likes_count,\n      comments_count\n    `,
      )
      .eq('id', id)
      .single();
    if (error || !data) throw error || new Error('User data not found');
    return {
      id: data.id,
      username: data.username,
      avatar_url: data.avatar_url,
      created_at: formatDateString(data.created_at),
      last_sign_in_at: formatDateString(data.last_sign_in_at),
      models_count: data.models_count,
      likes_count: data.likes_count,
      comments_count: data.comments_count,
    };
  }, 'SupabaseService');

  static fetchLikedModelIdsByUsername = logMethod(async function fetchLikedModelIdsByUsername(
    username: string,
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from('model_likes')
      .select('model_id, users!model_likes_user_id_fkey_public(username)')
      .eq('users.username', username);
    if (error) {
      console.error('Error fetching liked model IDs by username:', error);
      return [];
    }
    return (data as any[]).map((row) => row.model_id);
  }, 'SupabaseService');

  static fetchCommentedModelIdsByUsername = logMethod(
    async function fetchCommentedModelIdsByUsername(username: string): Promise<string[]> {
      const { data, error } = await supabase
        .from('model_comments')
        .select('model_id, users!model_comments_user_id_fkey_public(username)')
        .eq('users.username', username);
      if (error) {
        console.error('Error fetching commented model IDs by username:', error);
        return [];
      }
      return (data as any[]).map((row) => row.model_id);
    },
    'SupabaseService',
  );

  static deleteUser = logMethod(async function deleteUser(id: string | undefined): Promise<void> {
    if (!id) throw new Error('User ID must be specified to delete a user.');

    // find all model ids of user so that we can delete all preview images
    console.log('DELETE user with id:', id, 'started.');
    const modelSelectResponse = await supabase.from('models').select('id').eq('owner_id', id);
    if (modelSelectResponse.error) throw modelSelectResponse.error;
    console.log('DELETING all previews of models', modelSelectResponse.data);
    await Promise.all(
      modelSelectResponse.data?.map((modelId) => {
        console.log('DELETING preview', modelId);
        supabase.storage.from('previews').remove([`${modelId}.webp`]);
      }),
    );
    console.log('DELETING user', id);
    const userDeleteResponse = await supabase.from('users').delete().eq('id', id);
    if (userDeleteResponse.error) throw userDeleteResponse.error;
    console.log('DELETED user', userDeleteResponse.data);
    console.log('DELETE finished.');
  }, 'SupabaseService');
}
