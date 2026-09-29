import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef
} from 'react';

import {
  Search,
  MessageCircle,
  FileText,
  Users,
  Clock3,
  Heart,
  Send,
  ImageIcon,
  LinkIcon,
  BarChart3,
  Eye,
  Flag,
  X,
  ChevronRight,
  Leaf,
  Globe2,
  House,
  Laptop,
  Shirt,
  BookOpen,
  Plus,
  Loader2
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import {
  getCommunityPosts,
  getCommunityCategories,
  getCommunityPostDetails,
  createCommunityPost,
  toggleCommunityLike,
  addCommunityComment,
  getMyCommunityItems,
  reportCommunityPost,
  getMyCommunityActivity
} from '../../services/buyer/buyerCommunityApi';

import '../../styles/buyer/BuyerCommunity.css';


/* ============================================================
   HELPERS
============================================================ */

const formatDate = (dateValue) => {
  if (!dateValue) return '';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};


const formatTimeAgo = (dateValue) => {
  if (!dateValue) return '';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();

  const seconds = Math.floor(
    (now.getTime() - date.getTime()) / 1000
  );

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDate(dateValue);
};


const getInitials = (
  firstName = '',
  lastName = ''
) => {
  const first = String(firstName)
    .trim()
    .charAt(0);

  const last = String(lastName)
    .trim()
    .charAt(0);

  const result = `${first}${last}`.trim();

  return result || 'U';
};


const getDisplayName = (item) => {
  if (!item) return 'Community Member';

  const fullName = [
    item.first_name,
    item.last_name
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (fullName) {
    return fullName;
  }

  if (item.name) {
    return item.name;
  }

  if (item.email) {
    return item.email;
  }

  return 'Community Member';
};


const getCategoryIcon = (category = '') => {
  const value = String(category)
    .toLowerCase()
    .trim();

  if (
    value.includes('fashion') ||
    value.includes('clothes') ||
    value.includes('clothing')
  ) {
    return Shirt;
  }

  if (
    value.includes('tech') ||
    value.includes('electronic') ||
    value.includes('laptop')
  ) {
    return Laptop;
  }

  if (
    value.includes('book') ||
    value.includes('education')
  ) {
    return BookOpen;
  }

  if (
    value.includes('home') ||
    value.includes('living')
  ) {
    return House;
  }

  if (
    value.includes('eco') ||
    value.includes('environment') ||
    value.includes('sustain')
  ) {
    return Leaf;
  }

  return Globe2;
};


const getSafeNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const getListingImageUrl = (value) => {
  if (!value) return '';

  const image = String(value).trim();

  if (!image) return '';

  if (
    image.startsWith('http://') ||
    image.startsWith('https://') ||
    image.startsWith('data:')
  ) {
    return image;
  }

  const baseUrl =
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000';

  if (image.startsWith('/')) {
    return `${baseUrl}${image}`;
  }

  return `${baseUrl}/${image}`;
};


/* ============================================================
   COMPONENT
============================================================ */

const BuyerCommunity = () => {

  const navigate = useNavigate();


  /* ==========================================================
     POSTS
  ========================================================== */

  const [posts, setPosts] = useState([]);

  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');


  /* ==========================================================
     SEARCH / FILTER
  ========================================================== */

  const [search, setSearch] = useState('');

  const [searchInput, setSearchInput] = useState('');

  const [activeCategory, setActiveCategory] = useState('');

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });


  /* ==========================================================
     MY ACTIVITY
  ========================================================== */

  const [activityItems, setActivityItems] = useState([]);

  const [activityLoading, setActivityLoading] = useState(false);

  const [activityError, setActivityError] = useState('');


  /* ==========================================================
     TABS
  ========================================================== */

  const [activeTab, setActiveTab] = useState(
    'discussions'
  );


  /* ==========================================================
     POST DETAILS
  ========================================================== */

  const [selectedPost, setSelectedPost] = useState(null);

  const [comments, setComments] = useState([]);

  const [detailsLoading, setDetailsLoading] = useState(false);

  const [commentText, setCommentText] = useState('');

  const [submittingComment, setSubmittingComment] =
    useState(false);

  // Existing listings that can be attached to a comment
  const [commentItems, setCommentItems] = useState([]);

  const [commentItemsLoading, setCommentItemsLoading] =
    useState(false);

  const [selectedCommentItem, setSelectedCommentItem] =
    useState(null);


  /* ==========================================================
     CREATE POST
  ========================================================== */

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [newPost, setNewPost] = useState({
    title: '',
    body: '',
    category: ''
  });

  const [creatingPost, setCreatingPost] =
    useState(false);

  const [newPostImage, setNewPostImage] =
    useState(null);

  const [newPostImagePreview, setNewPostImagePreview] =
    useState('');

  const communityImageInputRef =
    useRef(null);


  /* ==========================================================
     REPORT
  ========================================================== */

  const [showReportModal, setShowReportModal] =
    useState(false);

  const [reportPostId, setReportPostId] =
    useState(null);

  const [reportReason, setReportReason] =
    useState('');

  const [reportDescription, setReportDescription] =
    useState('');

  const [submittingReport, setSubmittingReport] =
    useState(false);


  /* ==========================================================
     CATEGORY LIST
  ========================================================== */

  const visibleCategories = useMemo(() => {

    if (!Array.isArray(categories)) {
      return [];
    }

    return categories.filter(
      (item) => item?.category
    );

  }, [categories]);


  /* ==========================================================
     LOAD CATEGORIES
  ========================================================== */

  const loadCategories = useCallback(
    async () => {

      try {

        const result =
          await getCommunityCategories();

        setCategories(
          Array.isArray(result?.categories)
            ? result.categories
            : []
        );

      } catch (err) {

        console.error(
          'BUYER COMMUNITY CATEGORY ERROR:',
          err
        );

        setCategories([]);

      }

    },
    []
  );


  /* ==========================================================
     LOAD POSTS
  ========================================================== */

  const loadPosts = useCallback(
    async () => {

      setLoading(true);
      setError('');

      try {

        const result =
          await getCommunityPosts({
            search,
            category: activeCategory,
            page,
            limit: 10
          });

        const resultPosts =
          Array.isArray(result?.items)
            ? result.items
            : Array.isArray(result?.data)
              ? result.data
              : [];

        setPosts(resultPosts);

        if (result?.pagination) {

          setPagination({
            page:
              getSafeNumber(
                result.pagination.page,
                page
              ),

            limit:
              getSafeNumber(
                result.pagination.limit,
                10
              ),

            total:
              getSafeNumber(
                result.pagination.total,
                resultPosts.length
              ),

            totalPages:
              getSafeNumber(
                result.pagination.totalPages,
                1
              )
          });

        } else {

          setPagination({
            page,
            limit: 10,
            total: resultPosts.length,
            totalPages: 1
          });

        }

      } catch (err) {

        console.error(
          'BUYER COMMUNITY LOAD ERROR:',
          err
        );

        setPosts([]);

        setError(
          err?.message ||
          'Failed to load community posts.'
        );

      } finally {

        setLoading(false);

      }

    },
    [
      search,
      activeCategory,
      page
    ]
  );


  /* ==========================================================
     LOAD MY ACTIVITY
  ========================================================== */

  const loadActivity = useCallback(
    async () => {

      setActivityLoading(true);
      setActivityError('');

      try {

        const result =
          await getMyCommunityActivity({
            page: 1,
            limit: 20
          });

        const items =
          Array.isArray(result?.items)
            ? result.items
            : Array.isArray(result?.activity)
              ? result.activity
              : Array.isArray(result?.data)
                ? result.data
                : [];

        setActivityItems(items);

      } catch (err) {

        console.error(
          'BUYER COMMUNITY ACTIVITY ERROR:',
          err
        );

        setActivityItems([]);

        setActivityError(
          err?.message ||
          'Failed to load your community activity.'
        );

      } finally {

        setActivityLoading(false);

      }

    },
    []
  );


  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {

    loadCategories();

  }, [loadCategories]);


  useEffect(() => {

    loadPosts();

  }, [loadPosts]);


  /* ==========================================================
     SEARCH
  ========================================================== */

  const handleSearch = (event) => {

    event.preventDefault();

    setPage(1);

    setSearch(
      searchInput.trim()
    );

  };


  /* ==========================================================
     CATEGORY
  ========================================================== */

  const handleCategoryChange = (
    category
  ) => {

    setActiveCategory(category);

    setPage(1);

  };


  /* ==========================================================
     OPEN POST
  ========================================================== */

  const openPost = async (post) => {

    if (!post?.post_id) {
      return;
    }

    setSelectedPost(post);

    setComments([]);

    setCommentText('');

    setSelectedCommentItem(null);

    setDetailsLoading(true);
    setCommentItemsLoading(true);

    try {

      try {
        const itemResult =
          await getMyCommunityItems();

        setCommentItems(
          Array.isArray(itemResult?.items)
            ? itemResult.items
            : []
        );
      } catch (itemError) {
        console.error(
          'BUYER COMMUNITY COMMENT ITEMS ERROR:',
          itemError
        );
        setCommentItems([]);
      }

      const result =
        await getCommunityPostDetails(
          post.post_id
        );

      if (result?.post) {

        setSelectedPost(
          result.post
        );

      }

      setComments(
        Array.isArray(result?.comments)
          ? result.comments
          : []
      );

    } catch (err) {

      console.error(
        'BUYER COMMUNITY DETAILS ERROR:',
        err
      );

    } finally {

      setDetailsLoading(false);
      setCommentItemsLoading(false);

    }

  };


  /* ==========================================================
     CLOSE POST
  ========================================================== */

  const closePost = () => {

    setSelectedPost(null);

    setComments([]);

    setCommentText('');

    setSelectedCommentItem(null);

  };


  /* ==========================================================
     LIKE
  ========================================================== */

  const handleLike = async (post) => {

    if (!post?.post_id) {
      return;
    }

    try {

      const result =
        await toggleCommunityLike(
          post.post_id
        );

      const liked =
        Boolean(result?.liked);

      const likeCount =
        getSafeNumber(
          result?.like_count,
          post.like_count
        );

      setPosts((currentPosts) =>
        currentPosts.map((item) =>
          item.post_id === post.post_id
            ? {
                ...item,
                liked_by_current_user:
                  liked,
                liked: liked,
                like_count:
                  likeCount
              }
            : item
        )
      );


      if (
        selectedPost?.post_id ===
        post.post_id
      ) {

        setSelectedPost((current) => ({
          ...current,
          liked_by_current_user:
            liked,
          liked:
            liked,
          like_count:
            likeCount
        }));

      }

    } catch (err) {

      console.error(
        'BUYER COMMUNITY LIKE ERROR:',
        err
      );

    }

  };


  /* ==========================================================
     COMMENT
  ========================================================== */

  const handleCommentSubmit = async (
    event
  ) => {

    event.preventDefault();

    if (
      !selectedPost?.post_id ||
      (!commentText.trim() && !selectedCommentItem)
    ) {
      return;
    }

    setSubmittingComment(true);

    try {

      const result =
        await addCommunityComment(
          selectedPost.post_id,
          commentText.trim(),
          selectedCommentItem?.listing_id || null
        );

      if (result?.comment) {

        // The INSERT response may contain only listing_id.
        // Reload the post so the comment also receives
        // listing_title and listing_image_url from the backend.
        const refreshed =
          await getCommunityPostDetails(
            selectedPost.post_id
          );

        setComments(
          Array.isArray(refreshed?.comments)
            ? refreshed.comments
            : [
                ...comments,
                result.comment
              ]
        );

        if (refreshed?.post) {
          setSelectedPost(refreshed.post);
        }

        setCommentText('');
        setSelectedCommentItem(null);

        setPosts((currentPosts) =>
          currentPosts.map((item) =>
            item.post_id ===
            selectedPost.post_id
              ? {
                  ...item,
                  comment_count:
                    getSafeNumber(
                      item.comment_count
                    ) + 1
                }
              : item
          )
        );

        setSelectedPost((current) => ({
          ...current,
          comment_count:
            getSafeNumber(
              current.comment_count
            ) + 1
        }));

      } else {

        /*
          If backend does not return the newly
          created comment, reload the post.
        */

        const refreshed =
          await getCommunityPostDetails(
            selectedPost.post_id
          );

        setComments(
          Array.isArray(refreshed?.comments)
            ? refreshed.comments
            : []
        );

        if (refreshed?.post) {

          setSelectedPost(
            refreshed.post
          );

        }

        setCommentText('');
        setSelectedCommentItem(null);

      }

    } catch (err) {

      console.error(
        'BUYER COMMUNITY COMMENT ERROR:',
        err
      );

    } finally {

      setSubmittingComment(false);

    }

  };


  /* ==========================================================
     OPEN CREATE POST
  ========================================================== */

  const openCreatePost = () => {

    setNewPost({
      title: '',
      body: '',
      category:
        activeCategory ||
        visibleCategories[0]?.category ||
        ''
    });

    setNewPostImage(null);

    setNewPostImagePreview('');

    if (communityImageInputRef.current) {
      communityImageInputRef.current.value = '';
    }

    setShowCreateModal(true);

  };


  /* ==========================================================
     CLOSE CREATE POST
  ========================================================== */

  const closeCreatePost = () => {

    if (creatingPost) {
      return;
    }

    setShowCreateModal(false);

    setNewPost({
      title: '',
      body: '',
      category: ''
    });

    setNewPostImage(null);

    setNewPostImagePreview('');

    if (communityImageInputRef.current) {
      communityImageInputRef.current.value = '';
    }

  };


  /* ==========================================================
     COMMUNITY IMAGE
  ========================================================== */

  const handleCommunityImageChange = (
    event
  ) => {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedTypes.includes(
      file.type
    )) {
      alert(
        'Please select a JPG, PNG, WEBP, or GIF image.'
      );

      event.target.value = '';

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      alert(
        'Image size must not exceed 5 MB.'
      );

      event.target.value = '';

      return;
    }

    setNewPostImage(file);

    const reader =
      new FileReader();

    reader.onload = () => {
      setNewPostImagePreview(
        String(reader.result || '')
      );
    };

    reader.readAsDataURL(file);
  };


  const removeCommunityImage = () => {

    setNewPostImage(null);

    setNewPostImagePreview('');

    if (communityImageInputRef.current) {
      communityImageInputRef.current.value = '';
    }

  };


  /* ==========================================================
     CREATE POST
  ========================================================== */

  const handleCreatePost = async (
    event
  ) => {

    event.preventDefault();

    const title =
      newPost.title.trim();

    const body =
      newPost.body.trim();

    const category =
      newPost.category.trim();


    if (!title) {
      return;
    }

    if (!body) {
      return;
    }

    setCreatingPost(true);

    try {

      await createCommunityPost({
        title,
        body,
        category,
        image: newPostImage
      });

      setShowCreateModal(false);

      setNewPost({
        title: '',
        body: '',
        category: ''
      });

      setNewPostImage(null);

      setNewPostImagePreview('');

      if (communityImageInputRef.current) {
        communityImageInputRef.current.value = '';
      }

      setPage(1);

      /*
        Reload categories and posts
        so the new DB data immediately
        appears in the page.
      */

      await loadCategories();

      await loadPosts();

    } catch (err) {

      console.error(
        'BUYER COMMUNITY CREATE ERROR:',
        err
      );

      alert(
        err?.message ||
        'Failed to create post.'
      );

    } finally {

      setCreatingPost(false);

    }

  };


  /* ==========================================================
     REPORT
  ========================================================== */

  const openReportModal = (post) => {

    if (!post?.post_id) {
      return;
    }

    setReportPostId(
      post.post_id
    );

    setReportReason('');

    setReportDescription('');

    setShowReportModal(true);

  };


  const closeReportModal = () => {

    if (submittingReport) {
      return;
    }

    setShowReportModal(false);

    setReportPostId(null);

    setReportReason('');

    setReportDescription('');

  };


  const handleReport = async (
    event
  ) => {

    event.preventDefault();

    if (
      !reportPostId ||
      !reportReason.trim()
    ) {
      return;
    }

    setSubmittingReport(true);

    try {

      await reportCommunityPost({
        postId: reportPostId,
        reason: reportReason.trim(),
        description:
          reportDescription.trim()
      });

      alert(
        'Report submitted successfully.'
      );

      closeReportModal();

    } catch (err) {

      console.error(
        'BUYER COMMUNITY REPORT ERROR:',
        err
      );

      alert(
        err?.message ||
        'Failed to submit report.'
      );

    } finally {

      setSubmittingReport(false);

    }

  };


  /* ==========================================================
     TAB
  ========================================================== */

  const handleTabChange = (
    tab
  ) => {

    setActiveTab(tab);

    if (tab === 'discussions') {

      setSearch('');

      setSearchInput('');

    }

    if (tab === 'activity') {
      loadActivity();
    }

  };


  /* ==========================================================
     PAGINATION
  ========================================================== */

  const handlePreviousPage = () => {

    if (page <= 1) {
      return;
    }

    setPage(
      (current) =>
        Math.max(1, current - 1)
    );

  };


  const handleNextPage = () => {

    if (
      page >=
      pagination.totalPages
    ) {
      return;
    }

    setPage(
      (current) =>
        Math.min(
          pagination.totalPages,
          current + 1
        )
    );

  };


  /* ==========================================================
     QUICK ACTIONS
  ========================================================== */

  const browseMarketplace = () => {

    navigate(
      '/buyer/marketplace'
    );

  };


  /* ==========================================================
     RENDER POST
  ========================================================== */

  const renderPost = (post) => {

    const displayName =
      getDisplayName(post);

    const initials =
      getInitials(
        post.first_name,
        post.last_name
      );

    const category =
      post.category ||
      'Discussion';

    const CategoryIcon =
      getCategoryIcon(category);

    const liked =
      Boolean(
        post.liked_by_current_user ||
        post.liked
      );

    const likeCount =
      getSafeNumber(
        post.like_count
      );

    const commentCount =
      getSafeNumber(
        post.comment_count
      );


    return (
      <article
        key={post.post_id}
        className="community-post-card"
      >

        {/* ==================================================
            AVATAR
        ================================================== */}

        <div className="community-post-avatar">

          {post.profile_image ? (
            <img
              src={post.profile_image}
              alt={displayName}
            />
          ) : (
            initials
          )}

        </div>


        {/* ==================================================
            BODY
        ================================================== */}

        <div className="community-post-body">

          <div className="community-post-top">

            <div>

              <div className="community-author-row">

                <strong>
                  {displayName}
                </strong>

                <span className="community-member-badge">
                  Member
                </span>

              </div>

              <div className="community-post-meta">

                <Clock3 size={11} />

                <span>
                  {formatTimeAgo(
                    post.created_at
                  )}
                </span>

                {category && (
                  <>
                    <span>•</span>

                    <span>
                      {category}
                    </span>
                  </>
                )}

              </div>

            </div>


            {/* DIRECT ACTION ICONS */}

            <div
              style={{
                display: 'flex',
                gap: '3px'
              }}
            >

              <button
                type="button"
                className="community-icon-action"
                title="View post"
                onClick={() =>
                  openPost(post)
                }
              >
                <Eye size={17} />
              </button>

              <button
                type="button"
                className="community-icon-action"
                title="Report post"
                onClick={() =>
                  openReportModal(post)
                }
              >
                <Flag size={16} />
              </button>

            </div>

          </div>


          {/* ==================================================
              TITLE
          ================================================== */}

          <button
            type="button"
            className="community-post-title-button"
            onClick={() =>
              openPost(post)
            }
          >
            {post.title ||
              'Community Discussion'}
          </button>


          {/* ==================================================
              IMAGE
          ================================================== */}

          {post.image_url && (
            <div className="community-post-image-wrap">
              <img
                src={post.image_url}
                alt={
                  post.title ||
                  'Community item'
                }
                className="community-post-image"
                onError={(event) => {
                  event.currentTarget.style.display =
                    'none';
                }}
              />
            </div>
          )}


          {/* ==================================================
              BODY
          ================================================== */}

          {post.body && (
            <p className="community-post-text">

              {post.body}

            </p>
          )}


          {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="community-post-footer">

            <button
              type="button"
              className={
                liked
                  ? 'liked'
                  : ''
              }
              onClick={() =>
                handleLike(post)
              }
            >

              <Heart
                size={16}
                fill={
                  liked
                    ? 'currentColor'
                    : 'none'
                }
              />

              <span>
                {likeCount}
              </span>

            </button>


            <button
              type="button"
              onClick={() =>
                openPost(post)
              }
            >

              <MessageCircle
                size={16}
              />

              <span>
                {commentCount}
              </span>

            </button>


            <button
              type="button"
              onClick={() =>
                openPost(post)
              }
            >

              <Eye size={15} />

              <span>
                View
              </span>

            </button>

          </div>

        </div>

      </article>
    );

  };


  /* ============================================================
     MAIN RENDER
  ============================================================ */

  return (
    <div className="buyer-community">

      {/* ======================================================
          MAIN GRID
      ====================================================== */}

      <div className="community-main-grid">


        {/* ====================================================
            FEED
        ==================================================== */}

        <main className="community-feed-column">


          {/* ==================================================
              TABS
          ================================================== */}

          <div className="community-tabs">

            <button
              type="button"
              className={
                activeTab === 'discussions'
                  ? 'community-tab active'
                  : 'community-tab'
              }
              onClick={() =>
                handleTabChange(
                  'discussions'
                )
              }
            >

              <MessageCircle
                size={17}
              />

              Discussions

            </button>


            <button
              type="button"
              className={
                activeTab === 'posts'
                  ? 'community-tab active'
                  : 'community-tab'
              }
              onClick={() =>
                handleTabChange(
                  'posts'
                )
              }
            >

              <FileText
                size={17}
              />

              Posts

            </button>


            


            <button
              type="button"
              className={
                activeTab === 'activity'
                  ? 'community-tab active'
                  : 'community-tab'
              }
              onClick={() =>
                handleTabChange(
                  'activity'
                )
              }
            >

              <Clock3
                size={17}
              />

              My Activity

            </button>

          </div>


          {/* ==================================================
              GROUP TAB
          ================================================== */}

          {activeTab === 'activity' ? (

            <>

              {activityLoading ? (

                <div className="community-loading">

                  <div className="community-spinner" />

                  Loading your activity...

                </div>

              ) : activityError ? (

                <div className="community-error">

                  {activityError}

                  <button
                    type="button"
                    onClick={
                      loadActivity
                    }
                  >
                    Retry
                  </button>

                </div>

              ) : activityItems.length === 0 ? (

                <div className="community-empty">

                  <Clock3
                    size={38}
                  />

                  <h3>
                    My Activity
                  </h3>

                  <p>
                    Your posts, comments, and likes will appear here.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      handleTabChange('discussions')
                    }
                  >
                    <MessageCircle
                      size={14}
                    />
                    Explore Community
                  </button>

                </div>

              ) : (

                <div className="community-activity-list community-activity-feed">

                  {activityItems.map((activity) => {

                    const activityTitle =
                      activity.title ||
                      'Community activity';

                    const activityType =
                      String(
                        activity.activity_type ||
                        ''
                      ).toLowerCase();

                    const activityLabel =
                      activityType === 'post'
                        ? 'Created a post'
                        : activityType === 'comment'
                          ? 'Commented on a post'
                          : activityType === 'like'
                            ? 'Liked a post'
                            : 'Community activity';

                    return (
                      <button
                        key={`${activity.activity_type}-${activity.activity_id}`}
                        type="button"
                        className="community-activity-card"
                        onClick={() => {

                          if (activity.post_id) {

                            openPost({
                              post_id:
                                activity.post_id,
                              title:
                                activity.title,
                              body:
                                activity.body,
                              category:
                                activity.category
                            });

                          }

                        }}
                      >

                        <div className="community-activity-icon">

                          {activityType === 'like' ? (
                            <Heart
                              size={15}
                            />
                          ) : activityType === 'comment' ? (
                            <MessageCircle
                              size={15}
                            />
                          ) : (
                            <FileText
                              size={15}
                            />
                          )}

                        </div>

                        <div className="community-activity-content">

                          <strong>
                            {activityLabel}
                          </strong>

                          <span>
                            {activityTitle}
                          </span>

                          {activity.comment_text && (
                            <small>
                              {activity.comment_text}
                            </small>
                          )}

                        </div>

                        <span className="community-activity-date">
                          {formatTimeAgo(
                            activity.activity_date
                          )}
                        </span>

                      </button>
                    );

                  })}

                </div>

              )}

            </>

          ) : (

            <>


              {/* ============================================
                  CREATE CARD
              ============================================ */}

              <section className="community-create-card">

                <div className="community-create-avatar">

                  U

                </div>


                <div className="community-create-content">

                  <button
                    type="button"
                    className="community-create-input"
                    onClick={
                      openCreatePost
                    }
                  >
                    Share something with the community...
                  </button>


                  <div className="community-create-actions">

                    <button
                      type="button"
                      onClick={
                        openCreatePost
                      }
                    >

                      <ImageIcon
                        size={15}
                      />

                      Photo

                    </button>


                    <button
                      type="button"
                      onClick={
                        openCreatePost
                      }
                    >

                      <LinkIcon
                        size={15}
                      />

                      Link

                    </button>


                    <button
                      type="button"
                      onClick={
                        openCreatePost
                      }
                    >

                      <BarChart3
                        size={15}
                      />

                      Poll

                    </button>


                    <button
                      type="button"
                      className="community-post-button"
                      onClick={
                        openCreatePost
                      }
                    >

                      <Send
                        size={14}
                      />

                      Post

                    </button>

                  </div>

                </div>

              </section>


              {/* ============================================
                  SEARCH
              ============================================ */}

              <form
                className="community-search-box"
                onSubmit={
                  handleSearch
                }
              >

                <Search
                  size={17}
                />

                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(
                      event.target.value
                    )
                  }
                  placeholder="Search community posts..."
                />

                <button
                  type="submit"
                >
                  Search
                </button>

              </form>


              {/* ============================================
                  CATEGORY FILTER
              ============================================ */}

              <div className="community-category-filter">

                <button
                  type="button"
                  className={
                    activeCategory === ''
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    handleCategoryChange('')
                  }
                >
                  All
                </button>


                {visibleCategories.map(
                  (item) => {

                    const category =
                      item.category;

                    return (
                      <button
                        key={category}
                        type="button"
                        className={
                          activeCategory ===
                          category
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          handleCategoryChange(
                            category
                          )
                        }
                      >
                        {category}
                      </button>
                    );

                  }
                )}

              </div>


              {/* ============================================
                  ERROR
              ============================================ */}

              {error && !loading && (

                <div className="community-error">

                  {error}

                  <button
                    type="button"
                    onClick={
                      loadPosts
                    }
                  >
                    Retry
                  </button>

                </div>

              )}


              {/* ============================================
                  LOADING
              ============================================ */}

              {loading ? (

                <div className="community-loading">

                  <div className="community-spinner" />

                  Loading community posts...

                </div>

              ) : posts.length === 0 ? (

                <div className="community-empty">

                  <Users
                    size={42}
                  />

                  <h3>
                    No community posts yet
                  </h3>

                  <p>
                    Be the first to start a conversation.
                  </p>

                  <button
                    type="button"
                    onClick={
                      openCreatePost
                    }
                  >

                    <Plus
                      size={14}
                    />

                    Create Post

                  </button>

                </div>

              ) : (

                <>

                  {/* ======================================
                      POSTS
                  ====================================== */}

                  {posts.map(
                    renderPost
                  )}


                  {/* ======================================
                      PAGINATION
                  ====================================== */}

                  {pagination.totalPages > 1 && (

                    <div className="community-pagination">

                      <button
                        type="button"
                        disabled={
                          page <= 1
                        }
                        onClick={
                          handlePreviousPage
                        }
                      >
                        Previous
                      </button>

                      <span>
                        Page {page} of{' '}
                        {
                          pagination.totalPages
                        }
                      </span>

                      <button
                        type="button"
                        disabled={
                          page >=
                          pagination.totalPages
                        }
                        onClick={
                          handleNextPage
                        }
                      >
                        Next
                      </button>

                    </div>

                  )}

                </>

              )}

            </>

          )}

        </main>


        {/* ====================================================
            RIGHT SIDEBAR
        ==================================================== */}

        <aside className="community-right-column">


          {/* ==================================================
              CATEGORIES
          ================================================== */}

          <section className="community-side-card">

            <div className="community-side-title">

              <span>
                Community Categories
              </span>

              <Leaf
                size={16}
              />

            </div>


            {visibleCategories.length === 0 ? (

              <div className="community-side-empty">

                No categories available.

              </div>

            ) : (

              visibleCategories
                .slice(0, 6)
                .map((item) => {

                  const category =
                    item.category;

                  const CategoryIcon =
                    getCategoryIcon(
                      category
                    );

                  const postCount =
                    getSafeNumber(
                      item.post_count
                    );

                  return (
                    <button
                      key={category}
                      type="button"
                      className="community-category-row"
                      onClick={() =>
                        handleCategoryChange(
                          category
                        )
                      }
                    >

                      <div className="community-category-icon">

                        <CategoryIcon
                          size={17}
                        />

                      </div>


                      <div className="community-category-info">

                        <strong>
                          {category}
                        </strong>

                        <small>
                          {postCount}{' '}
                          {postCount === 1
                            ? 'post'
                            : 'posts'}
                        </small>

                      </div>


                      <ChevronRight
                        size={15}
                      />

                    </button>
                  );

                })

            )}

          </section>


          {/* ==================================================
              QUICK ACTIONS
          ================================================== */}

          <section className="community-side-card">

            <div className="community-side-title">

              <span>
                Quick Actions
              </span>

              <Users
                size={16}
              />

            </div>


            <button
              type="button"
              className="community-quick-action"
              onClick={
                browseMarketplace
              }
            >

              <Search
                size={16}
              />

              <span>
                Browse Marketplace
              </span>

              <ChevronRight
                size={15}
              />

            </button>


            <button
              type="button"
              className="community-quick-action"
              onClick={
                openCreatePost
              }
            >

              <MessageCircle
                size={16}
              />

              <span>
                Start a Discussion
              </span>

              <ChevronRight
                size={15}
              />

            </button>


            <button
              type="button"
              className="community-quick-action"
              onClick={() =>
                handleTabChange(
                  'discussions'
                )
              }
            >

              <Globe2
                size={16}
              />

              <span>
                Explore Community
              </span>

              <ChevronRight
                size={15}
              />

            </button>

          </section>


          {/* ==================================================
              GUIDELINES
          ================================================== */}

          <section className="community-side-card">

            <div className="community-side-title">

              <span>
                Community Guidelines
              </span>

              <Leaf
                size={16}
              />

            </div>


            <div className="community-guideline">

              <strong>
                Be respectful
              </strong>

              <span>
                Treat every member with kindness.
              </span>

            </div>


            <div className="community-guideline">

              <strong>
                Share useful content
              </strong>

              <span>
                Keep discussions helpful and relevant.
              </span>

            </div>


            <div className="community-guideline">

              <strong>
                Promote reuse
              </strong>

              <span>
                Help build a greener community.
              </span>

            </div>

          </section>

        </aside>

      </div>


      {/* ======================================================
          POST DETAILS MODAL
      ====================================================== */}

      {selectedPost && (

        <div
          className="community-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closePost();
            }

          }}
        >

          <div
            className="community-modal community-post-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="community-modal-header">

              <div>

                <div className="community-modal-label">
                  Community Post
                </div>

                <h2>
                  {selectedPost.title ||
                    'Community Discussion'}
                </h2>

              </div>


              <button
                type="button"
                className="community-modal-close"
                onClick={
                  closePost
                }
              >

                <X
                  size={18}
                />

              </button>

            </div>


            {detailsLoading ? (

              <div className="community-modal-loading">

                <Loader2
                  size={25}
                  className="community-spinner"
                />

                Loading post...

              </div>

            ) : (

              <>

                {/* ========================================
                    AUTHOR
                ======================================== */}

                <div className="community-detail-author">

                  <div className="community-post-avatar">

                    {selectedPost.profile_image ? (

                      <img
                        src={
                          selectedPost.profile_image
                        }
                        alt={
                          getDisplayName(
                            selectedPost
                          )
                        }
                      />

                    ) : (

                      getInitials(
                        selectedPost.first_name,
                        selectedPost.last_name
                      )

                    )}

                  </div>


                  <div>

                    <strong>
                      {getDisplayName(
                        selectedPost
                      )}
                    </strong>

                    <span>
                      {formatDate(
                        selectedPost.created_at
                      )}
                    </span>

                  </div>

                </div>


                {/* ========================================
                    IMAGE
                ======================================== */}

                {selectedPost.image_url && (
                  <div className="community-detail-image-wrap">
                    <img
                      src={selectedPost.image_url}
                      alt={
                        selectedPost.title ||
                        'Community item'
                      }
                      className="community-detail-image"
                    />
                  </div>
                )}


                {/* ========================================
                    CONTENT
                ======================================== */}

                <div className="community-detail-content">

                  {selectedPost.category && (

                    <span className="community-detail-category">

                      {selectedPost.category}

                    </span>

                  )}

                  <p>
                    {selectedPost.body ||
                      'No content available.'}
                  </p>

                </div>


                {/* ========================================
                    ACTIONS
                ======================================== */}

                <div className="community-detail-actions">

                  <button
                    type="button"
                    className={
                      selectedPost.liked_by_current_user ||
                      selectedPost.liked
                        ? 'liked'
                        : ''
                    }
                    onClick={() =>
                      handleLike(
                        selectedPost
                      )
                    }
                  >

                    <Heart
                      size={15}
                      fill={
                        selectedPost.liked_by_current_user ||
                        selectedPost.liked
                          ? 'currentColor'
                          : 'none'
                      }
                    />

                    {getSafeNumber(
                      selectedPost.like_count
                    )}

                  </button>


                  <button
                    type="button"
                    onClick={() => {
                      const element =
                        document.querySelector(
                          '.community-comment-form input'
                        );

                      if (element) {
                        element.focus();
                      }
                    }}
                  >

                    <MessageCircle
                      size={15}
                    />

                    {getSafeNumber(
                      selectedPost.comment_count
                    )}

                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      openReportModal(
                        selectedPost
                      )
                    }
                  >

                    <Flag
                      size={15}
                    />

                    Report

                  </button>

                </div>


                {/* ========================================
                    COMMENTS
                ======================================== */}

                <div className="community-comments">

                  <h3>
                    Comments
                  </h3>


                  {comments.length === 0 ? (

                    <div className="community-no-comments">

                      No comments yet. Be the first to comment.

                    </div>

                  ) : (

                    comments.map(
                      (comment) => {

                        const commentName =
                          getDisplayName(
                            comment
                          );

                        return (
                          <div
                            className="community-comment"
                            key={
                              comment.comment_id
                            }
                          >

                            <div className="community-comment-avatar">

                              {comment.profile_image ? (

                                <img
                                  src={
                                    comment.profile_image
                                  }
                                  alt={
                                    commentName
                                  }
                                />

                              ) : (

                                getInitials(
                                  comment.first_name,
                                  comment.last_name
                                )

                              )}

                            </div>


                            <div className="community-comment-content">

                              <strong>
                                {commentName}
                              </strong>

                              <span>
                                {formatTimeAgo(
                                  comment.created_at
                                )}
                              </span>

                              {comment.comment_text && (
                                <p>
                                  {comment.comment_text}
                                </p>
                              )}

                              {comment.listing_id && (
                                <div
                                  style={{
                                    marginTop: '8px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    background: '#fff',
                                    maxWidth: '280px'
                                  }}
                                >
                                  {comment.listing_image_url && (
                                    <img
                                      src={getListingImageUrl(
                                        comment.listing_image_url
                                      )}
                                      alt={
                                        comment.listing_title ||
                                        'Attached item'
                                      }
                                      style={{
                                        display: 'block',
                                        width: '100%',
                                        height: '150px',
                                        objectFit: 'cover'
                                      }}
                                      onError={(event) => {
                                        event.currentTarget.style.display =
                                          'none';
                                      }}
                                    />
                                  )}

                                  <div
                                    style={{
                                      padding: '9px 10px'
                                    }}
                                  >
                                    <strong
                                      style={{
                                        display: 'block',
                                        fontSize: '13px',
                                        color: '#1f2937'
                                      }}
                                    >
                                      {comment.listing_title ||
                                        'Attached item'}
                                    </strong>

                                    {comment.listing_type && (
                                      <span
                                        style={{
                                          display: 'block',
                                          marginTop: '2px',
                                          fontSize: '11px',
                                          color: '#6b7280'
                                        }}
                                      >
                                        {comment.listing_type}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                            </div>

                          </div>
                        );

                      }
                    )

                  )}

                </div>


                {/* ========================================
                    COMMENT FORM
                ======================================== */}

                {commentItemsLoading ? (
                  <div
                    style={{
                      marginBottom: '10px',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}
                  >
                    Loading your items...
                  </div>
                ) : (
                  <div
                    style={{
                      marginBottom: '10px'
                    }}
                  >
                    <label
                      htmlFor="community-comment-item"
                      style={{
                        display: 'block',
                        marginBottom: '5px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#374151'
                      }}
                    >
                      Attach an item (optional)
                    </label>

                    <select
                      id="community-comment-item"
                      value={
                        selectedCommentItem?.listing_id || ''
                      }
                      onChange={(event) => {
                        const listingId =
                          Number(event.target.value);

                        if (!listingId) {
                          setSelectedCommentItem(null);
                          return;
                        }

                        const item =
                          commentItems.find(
                            (entry) =>
                              Number(entry.listing_id) ===
                              listingId
                          );

                        setSelectedCommentItem(
                          item || null
                        );
                      }}
                      disabled={submittingComment}
                      style={{
                        width: '100%',
                        minHeight: '38px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        padding: '0 10px',
                        background: '#fff',
                        fontSize: '13px'
                      }}
                    >
                      <option value="">
                        No item attached
                      </option>

                      {commentItems.map((item) => (
                        <option
                          key={item.listing_id}
                          value={item.listing_id}
                        >
                          {item.title || 'Untitled item'}
                        </option>
                      ))}
                    </select>

                    {selectedCommentItem && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '7px',
                          padding: '7px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          background: '#f9fafb'
                        }}
                      >
                        {selectedCommentItem.listing_image_url ? (
                          <img
                            src={getListingImageUrl(
                              selectedCommentItem.listing_image_url
                            )}
                            alt={
                              selectedCommentItem.title ||
                              'Selected item'
                            }
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '6px',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '6px',
                              background: '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <ImageIcon size={18} />
                          </div>
                        )}

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0
                          }}
                        >
                          <strong
                            style={{
                              display: 'block',
                              fontSize: '12px'
                            }}
                          >
                            {selectedCommentItem.title}
                          </strong>

                          <span
                            style={{
                              fontSize: '11px',
                              color: '#6b7280'
                            }}
                          >
                            Item attached to your comment
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCommentItem(null)
                          }
                          disabled={submittingComment}
                          style={{
                            border: 0,
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Remove attached item"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <form
                  className="community-comment-form"
                  onSubmit={
                    handleCommentSubmit
                  }
                >

                  <input
                    type="text"
                    value={
                      commentText
                    }
                    onChange={(event) =>
                      setCommentText(
                        event.target.value
                      )
                    }
                    placeholder="Write a comment..."
                    disabled={
                      submittingComment
                    }
                  />


                  <button
                    type="submit"
                    disabled={
                      submittingComment ||
                      (!commentText.trim() &&
                        !selectedCommentItem)
                    }
                    title="Send comment"
                  >

                    {submittingComment ? (

                      <Loader2
                        size={16}
                        className="community-spinner"
                      />

                    ) : (

                      <Send
                        size={16}
                      />

                    )}

                  </button>

                </form>

              </>

            )}

          </div>

        </div>

      )}


      {/* ======================================================
          CREATE POST MODAL
      ====================================================== */}

      {showCreateModal && (

        <div
          className="community-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreatePost();
            }

          }}
        >

          <div
            className="community-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="community-modal-header">

              <div>

                <div className="community-modal-label">
                  Community
                </div>

                <h2>
                  Create Post
                </h2>

              </div>


              <button
                type="button"
                className="community-modal-close"
                onClick={
                  closeCreatePost
                }
                disabled={
                  creatingPost
                }
              >

                <X
                  size={18}
                />

              </button>

            </div>


            <form
              className="community-create-form"
              onSubmit={
                handleCreatePost
              }
            >

              <label htmlFor="community-post-title">
                Title
              </label>

              <input
                id="community-post-title"
                type="text"
                value={
                  newPost.title
                }
                onChange={(event) =>
                  setNewPost(
                    (current) => ({
                      ...current,
                      title:
                        event.target.value
                    })
                  )
                }
                placeholder="Enter your post title"
                maxLength={255}
                required
                disabled={
                  creatingPost
                }
              />


              <label htmlFor="community-post-category">
                Category
              </label>

              <select
                id="community-post-category"
                value={
                  newPost.category
                }
                onChange={(event) =>
                  setNewPost(
                    (current) => ({
                      ...current,
                      category:
                        event.target.value
                    })
                  )
                }
                disabled={
                  creatingPost
                }
              >

                <option value="">
                  Select category
                </option>

                <option value="Trade & Exchange">
                  Trade & Exchange
                </option>

                <option value="Donations">
                  Donations
                </option>

                {visibleCategories.map(
                  (item) => (
                    <option
                      key={
                        item.category
                      }
                      value={
                        item.category
                      }
                    >
                      {item.category}
                    </option>
                  )
                )}

              </select>


              <label>
                Item Photo
              </label>

              <div className="community-photo-upload-box">

                <input
                  ref={communityImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={
                    handleCommunityImageChange
                  }
                  disabled={
                    creatingPost
                  }
                  className="community-photo-input"
                />

                <button
                  type="button"
                  className="community-photo-button"
                  onClick={() => {
                    communityImageInputRef.current?.click();
                  }}
                  disabled={
                    creatingPost
                  }
                >
                  <ImageIcon size={16} />
                  {newPostImage
                    ? 'Change Photo'
                    : 'Choose Photo'}
                </button>

                <span className="community-photo-help">
                  JPG, PNG, WEBP or GIF • Max 5 MB
                </span>

              </div>

              {newPostImagePreview && (
                <div className="community-photo-preview-wrap">

                  <img
                    src={
                      newPostImagePreview
                    }
                    alt="Selected item preview"
                    className="community-photo-preview"
                  />

                  <button
                    type="button"
                    className="community-photo-remove"
                    onClick={
                      removeCommunityImage
                    }
                    disabled={
                      creatingPost
                    }
                  >
                    <X size={14} />
                    Remove
                  </button>

                </div>
              )}


              <label htmlFor="community-post-body">
                Description
              </label>

              <textarea
                id="community-post-body"
                rows="6"
                value={
                  newPost.body
                }
                onChange={(event) =>
                  setNewPost(
                    (current) => ({
                      ...current,
                      body:
                        event.target.value
                    })
                  )
                }
                placeholder="Share something useful with the community..."
                required
                disabled={
                  creatingPost
                }
              />


              <div className="community-form-actions">

                <button
                  type="button"
                  onClick={
                    closeCreatePost
                  }
                  disabled={
                    creatingPost
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={
                    creatingPost ||
                    !newPost.title.trim() ||
                    !newPost.body.trim()
                  }
                >

                  {creatingPost ? (

                    <>
                      <Loader2
                        size={14}
                        className="community-spinner"
                      />

                      Posting...

                    </>

                  ) : (

                    <>
                      <Send
                        size={14}
                      />

                      Post

                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ======================================================
          REPORT MODAL
      ====================================================== */}

      {showReportModal && (

        <div
          className="community-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeReportModal();
            }

          }}
        >

          <div
            className="community-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="community-modal-header">

              <div>

                <div className="community-modal-label">
                  Community
                </div>

                <h2>
                  Report Post
                </h2>

              </div>


              <button
                type="button"
                className="community-modal-close"
                onClick={
                  closeReportModal
                }
                disabled={
                  submittingReport
                }
              >

                <X
                  size={18}
                />

              </button>

            </div>


            <form
              className="community-create-form"
              onSubmit={
                handleReport
              }
            >

              <label htmlFor="community-report-reason">
                Reason
              </label>

              <select
                id="community-report-reason"
                value={
                  reportReason
                }
                onChange={(event) =>
                  setReportReason(
                    event.target.value
                  )
                }
                required
                disabled={
                  submittingReport
                }
              >

                <option value="">
                  Select a reason
                </option>

                <option value="Spam">
                  Spam
                </option>

                <option value="Inappropriate content">
                  Inappropriate content
                </option>

                <option value="Harassment">
                  Harassment
                </option>

                <option value="False information">
                  False information
                </option>

                <option value="Other">
                  Other
                </option>

              </select>


              <label htmlFor="community-report-description">
                Description
              </label>

              <textarea
                id="community-report-description"
                rows="5"
                value={
                  reportDescription
                }
                onChange={(event) =>
                  setReportDescription(
                    event.target.value
                  )
                }
                placeholder="Tell us more about the issue..."
                disabled={
                  submittingReport
                }
              />


              <div className="community-form-actions">

                <button
                  type="button"
                  onClick={
                    closeReportModal
                  }
                  disabled={
                    submittingReport
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={
                    submittingReport ||
                    !reportReason.trim()
                  }
                >

                  {submittingReport ? (

                    <>
                      <Loader2
                        size={14}
                      />

                      Submitting...

                    </>

                  ) : (

                    <>
                      <Flag
                        size={14}
                      />

                      Submit Report

                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};


export default BuyerCommunity;