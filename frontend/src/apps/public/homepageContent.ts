import { brandName, brandPositioning } from '../../components/landing/data';

export type HomepageLocale = 'en' | 'vi';

export type HomepageNavLink = {
  label: string;
  href: string;
};

export type HomepageMenuSection = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
};

export type HomepageSuggestion = {
  label: string;
  query: string;
};

export type HomepageContent = {
  navLinks: HomepageNavLink[];
  searchSuggestions: HomepageSuggestion[];
  menuSections: HomepageMenuSection[];
  pitchDeckSections: HomepageMenuSection[];
  ui: {
    languageLabel: string;
    openMenu: string;
    closeMenu: string;
    searchPlaceholder: string;
    searchButton: string;
    revenueTagline: string;
    resultsTitle: string;
    resultsEmptyTitle: string;
    resultsEmptyBody: string;
    resultsLoadingTitle: string;
    resultsLoadingBody: string;
    resultsQueryLabel: string;
    shortlistLabel: string;
    shortlistBody: string;
    bookingPanelTitle: string;
    bookingPanelEmpty: string;
    bookingPanelSelected: string;
    bookingPanelHelper: string;
    bookingButton: string;
    bookingSubmitting: string;
    bookingSuccessTitle: string;
    bookingSuccessBody: string;
    contactTeam: string;
    watchDemo: string;
    pitchDeck: string;
    roadmap: string;
    menuTitle: string;
    menuBody: string;
    statusLive: string;
    nameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    dateTimeLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    summaryTitle: string;
    noMatchTitle: string;
    noMatchBody: string;
    geoHint: string;
    thankYouTitle: string;
    thankYouBody: string;
    requestedSlotLabel: string;
    followUpLabel: string;
    paymentActionLabel: string;
    emailBookingLabel: string;
    calendarActionLabel: string;
    viewCalendarLabel: string;
    qrLabel: string;
    returnHomeLabel: string;
  };
};

export const pitchDeckHref = 'https://pitch.bookedai.au/';
export const roadmapHref = '/roadmap';
export const videoDemoHref = '/video-demo.html';

export const languageOptions: Array<{ value: HomepageLocale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
];

const hotEnglishSuggestions: HomepageSuggestion[] = [
  { label: 'Future Swim', query: 'Find Future Swim kids swimming lessons near Caringbah this weekend.' },
  { label: 'Co Mai Hung Chess', query: 'Book Co Mai Hung Chess Sydney pilot class this week.' },
  { label: 'WSTI AI Event', query: 'Show WSTI AI events at Western Sydney Startup Hub this month.' },
  { label: 'AI Mentor 1-1', query: 'Book an AI Mentor 1-1 session for startup growth this week.' },
  { label: 'Haircut', query: 'Find a men\'s haircut near Sydney CBD this afternoon.' },
  { label: 'Restaurant', query: 'Find a restaurant near me tonight with live booking or call details.' },
];

const hotVietnameseSuggestions: HomepageSuggestion[] = [
  { label: 'Future Swim', query: 'Tìm lớp bơi Future Swim cho trẻ em gần Caringbah vào cuối tuần này.' },
  { label: 'Co Mai Hung Chess', query: 'Đặt lớp Co Mai Hung Chess Sydney pilot trong tuần này.' },
  { label: 'WSTI AI Event', query: 'Tìm sự kiện AI WSTI tại Western Sydney Startup Hub trong tháng này.' },
  { label: 'AI Mentor 1-1', query: 'Đặt buổi AI Mentor 1-1 cho startup trong tuần này.' },
  { label: 'Haircut', query: 'Tìm lịch cắt tóc nam gần Sydney CBD vào chiều nay.' },
  { label: 'Restaurant', query: 'Tìm nhà hàng gần tôi tối nay có link đặt bàn hoặc số điện thoại để gọi đặt chỗ.' },
];

export function getHomepageContent(locale: HomepageLocale): HomepageContent {
  if (locale === 'vi') {
    return {
      navLinks: [
        { label: 'pitch.bookedai.au', href: pitchDeckHref },
        { label: 'Roadmap', href: roadmapHref },
        { label: 'Video Demo', href: videoDemoHref },
      ],
      searchSuggestions: hotVietnameseSuggestions,
      menuSections: [
        {
          id: 'platform',
          eyebrow: 'Chat Revenue Platform',
          title: 'Homepage hiện là landing page chính cho conversational revenue flow',
          body: 'BookedAI.au không chỉ là search runtime. Trang chủ giờ giải thích luôn cách hội thoại, qualification, booking path và revenue outcome được nối thành một hệ thống.',
          points: [
            'Hero cho thấy conversational preview thay vì chỉ một ô search.',
            'Capability cards, integrations và CTA đều bám theo cùng một thông điệp doanh thu.',
            'Pitch Deck vẫn dùng cho narrative sâu hơn, nhưng homepage đã là entry surface hoàn chỉnh.',
          ],
        },
        {
          id: 'revenue',
          eyebrow: 'Revenue Engine',
          title: 'BookedAI là cỗ máy kiếm tiền cho service SMEs',
          body: brandPositioning,
          points: [
            'Search intent đi vào từ một ô truy vấn duy nhất.',
            'Kết quả được xếp hạng và đưa thẳng sang hành động booking.',
            'Thanh toán, xác nhận và handoff được nối liên tục để tránh mất lead nóng.',
          ],
        },
        {
          id: 'channels',
          eyebrow: 'Conversation Channels',
          title: 'BookedAI thu và xử lý nhiều loại hội thoại trong một flow',
          body: 'Website chat, missed calls, email enquiries và follow-up đều được gom về cùng một hệ thống để giảm thất thoát lead nóng.',
          points: [
            'Một luồng xử lý nhất quán cho chat, calls, email và booking requests.',
            'Qualification và next step được hiển thị rõ thay vì trả lời chung chung.',
            'Kết quả cuối cùng luôn gắn với booking, callback, quote hoặc revenue recovery.',
          ],
        },
      ],
      pitchDeckSections: [
        {
          id: 'story',
          eyebrow: 'BookedAI Story',
          title: 'Từ enquiry rời rạc thành booking có doanh thu',
          body: 'BookedAI được xây để biến nhu cầu rời rạc của local service SMEs thành booking path rõ ràng, thay vì để đội ngũ xử lý thủ công từng lead.',
          points: [
            'Search-first acquisition surface.',
            'AI-guided shortlist và booking path.',
            'Payment, confirmation, và operator handoff cùng một luồng.',
          ],
        },
        {
          id: 'engine',
          eyebrow: 'Revenue Engine',
          title: 'BookedAI không phải chatbot, cũng không chỉ là widget booking',
          body: 'Nó là bề mặt doanh thu: nắm bắt demand, hiểu intent, xếp hạng best-fit match, rồi kéo user đi hết đến booking.',
          points: [
            'Giảm friction ở màn đầu.',
            'Tăng tỷ lệ chuyển đổi từ search sang booked.',
            'Tạo visibility tốt hơn cho operator về demand thật.',
          ],
        },
        {
          id: 'fit',
          eyebrow: 'Service SME Fit',
          title: 'Phù hợp cho salon, clinic, tutor, trades và local services',
          body: 'Bất kỳ business nào cần chuyển một yêu cầu tự nhiên thành action rõ ràng đều phù hợp với mô hình này.',
          points: [
            'Salon và clinic cần qualification nhanh.',
            'Trades cần triage urgency và routing.',
            'Tutor và local classes cần matching đúng dịch vụ trước checkout.',
          ],
        },
      ],
      ui: {
        languageLabel: 'Ngôn ngữ',
        openMenu: 'Mở Menu',
        closeMenu: 'Đóng Menu',
        searchPlaceholder: 'Bạn muốn đặt dịch vụ nào hôm nay?',
        searchButton: 'Try Now',
        revenueTagline: 'AI revenue engine for service businesses',
        resultsTitle: 'Kết quả tìm kiếm BookedAI',
        resultsEmptyTitle: 'Một ô search. Một hành động rõ ràng.',
        resultsEmptyBody: 'Nhập dịch vụ bạn cần và BookedAI sẽ dựng shortlist, booking path và confirmation ngay trên trang này.',
        resultsLoadingTitle: 'Đang tìm kết quả phù hợp nhất',
        resultsLoadingBody: 'BookedAI đang tìm nơi phù hợp nhất, kiểm tra khu vực liên quan và mở live search khi cần.',
        resultsQueryLabel: 'Truy vấn hiện tại',
        shortlistLabel: 'Shortlist',
        shortlistBody: 'Kết quả được hiển thị như một search surface độc lập, không phải popup assistant.',
        bookingPanelTitle: 'Booking',
        bookingPanelEmpty: 'Chọn một kết quả để tiếp tục booking.',
        bookingPanelSelected: 'Đã chọn',
        bookingPanelHelper: 'Luồng booking dùng cùng logic API với assistant cũ nhưng giao diện này là homepage search runtime mới hoàn toàn.',
        bookingButton: 'Tiếp tục booking',
        bookingSubmitting: 'Đang tạo booking...',
        bookingSuccessTitle: 'Booking đã sẵn sàng',
        bookingSuccessBody: 'Payment, confirmation và follow-up đã được chuẩn bị.',
        contactTeam: 'Liên hệ team',
        watchDemo: 'Xem demo',
        pitchDeck: 'pitch.bookedai.au',
        roadmap: 'Roadmap',
        menuTitle: 'Navigation',
        menuBody: 'Dùng menu này để điều hướng giữa live search, roadmap, demo và các lớp giải thích sâu hơn của BookedAI.au.',
        statusLive: 'Live search',
        nameLabel: 'Tên',
        emailLabel: 'Email',
        phoneLabel: 'Số điện thoại',
        dateTimeLabel: 'Thời gian mong muốn',
        notesLabel: 'Ghi chú booking',
        notesPlaceholder: 'Bổ sung yêu cầu, khung giờ hoặc bối cảnh để operator chuẩn bị tốt hơn.',
        summaryTitle: 'Tóm tắt',
        noMatchTitle: 'Chưa có match đủ mạnh',
        noMatchBody: 'BookedAI sẽ ưu tiên độ chính xác hơn là gợi ý sai domain.',
        geoHint: 'Nếu cần độ chính xác địa phương cao hơn, hãy thêm suburb hoặc khu vực mong muốn.',
        thankYouTitle: 'Cảm ơn bạn',
        thankYouBody: 'Booking đã được ghi nhận. QR, lịch và email follow-up đã sẵn sàng ngay bên dưới.',
        requestedSlotLabel: 'Khung giờ đã chọn',
        followUpLabel: 'Follow-up',
        paymentActionLabel: 'Tiếp tục thanh toán',
        emailBookingLabel: 'Gửi email booking',
        calendarActionLabel: 'Thêm vào lịch',
        viewCalendarLabel: 'Xem sự kiện lịch',
        qrLabel: 'Mã QR booking',
        returnHomeLabel: 'Về lại homepage',
      },
    };
  }

  return {
    navLinks: [
      { label: 'pitch.bookedai.au', href: pitchDeckHref },
      { label: 'Roadmap', href: roadmapHref },
      { label: 'Video Demo', href: videoDemoHref },
    ],
    searchSuggestions: hotEnglishSuggestions,
    menuSections: [
      {
        id: 'platform',
        eyebrow: 'Chat Revenue Platform',
        title: 'The homepage is now the primary conversational landing surface',
        body: 'BookedAI.au no longer needs to behave like a stripped-down search runtime. The homepage now carries the product story, conversational proof, and commercial CTA in one place.',
        points: [
          'The hero shows a conversational preview instead of only a search shell.',
          'Capability, integration, and outcome sections all point back to revenue.',
          'Pitch Deck still exists for deeper narrative, but the homepage is now a complete entry surface.',
        ],
      },
      {
        id: 'revenue',
        eyebrow: 'Revenue Engine',
        title: 'BookedAI is a revenue engine for service SMEs',
        body: brandPositioning,
        points: [
          'Search intent enters through a single query box.',
          'Results are ranked and pushed directly toward booking action.',
          'Payment, confirmation, and handoff stay connected so warm leads are not lost.',
        ],
      },
      {
        id: 'channels',
        eyebrow: 'Conversation Channels',
        title: 'BookedAI handles multiple conversation types in one commercial flow',
        body: 'Website chat, missed calls, email enquiries, and follow-up all move through the same qualification and booking logic so fewer warm leads leak out of the system.',
        points: [
          'One handling pattern for chat, calls, email, and booking requests.',
          'Qualification and next step are made explicit instead of vague.',
          'The visible outcome is always tied to booking, callback, quote, or recovery.',
        ],
      },
    ],
    pitchDeckSections: [
      {
        id: 'story',
        eyebrow: 'BookedAI Story',
        title: 'From scattered enquiries to revenue-ready bookings',
        body: 'BookedAI is built to turn messy demand from local service SMEs into a clear booking path instead of forcing teams to manually triage every lead.',
        points: [
          'A search-first acquisition surface.',
          'An AI-guided shortlist and booking path.',
          'Payment, confirmation, and operator handoff in one continuous flow.',
        ],
      },
      {
        id: 'engine',
        eyebrow: 'Revenue Engine',
        title: 'BookedAI is not just a chatbot or booking widget',
        body: 'It is a revenue surface: capture demand, understand intent, rank the best-fit option, and keep the user moving until they are booked.',
        points: [
          'Lower friction on the first screen.',
          'Higher conversion from search to booked.',
          'Clearer demand visibility for the operator team.',
        ],
      },
      {
        id: 'fit',
        eyebrow: 'Service SME Fit',
        title: 'Built for salons, clinics, tutors, trades, and local service teams',
        body: 'Any business that needs to turn a natural-language request into a confident next step fits this model.',
        points: [
          'Salons and clinics need faster qualification.',
          'Trades need urgency triage and routing.',
          'Tutors and local classes need correct matching before checkout.',
        ],
      },
    ],
    ui: {
      languageLabel: 'Language',
      openMenu: 'Open Menu',
      closeMenu: 'Close Menu',
      searchPlaceholder: 'What do you want to book?',
      searchButton: 'Search',
      revenueTagline: 'AI revenue engine for service businesses',
      resultsTitle: 'Results',
      resultsEmptyTitle: 'Search first. Move faster.',
      resultsEmptyBody: 'Enter the request once. The shortlist and next step stay in one flow.',
      resultsLoadingTitle: 'Ranking the best options.',
      resultsLoadingBody: 'Search is live. Fit, timing, and location are being refined now.',
      resultsQueryLabel: 'Query',
      shortlistLabel: 'Matches',
      shortlistBody: 'The strongest options appear here, ready for the next step.',
      bookingPanelTitle: 'Booking',
      bookingPanelEmpty: 'Select a match.',
      bookingPanelSelected: 'Selected',
      bookingPanelHelper: 'Choose the best fit and keep the booking moving.',
      bookingButton: 'Continue booking',
      bookingSubmitting: 'Preparing booking...',
      bookingSuccessTitle: 'Booking ready',
      bookingSuccessBody: 'Your next step is ready below.',
      contactTeam: 'Contact',
      watchDemo: 'Demo',
      pitchDeck: 'pitch.bookedai.au',
      roadmap: 'Roadmap',
      menuTitle: 'Navigation',
      menuBody: 'Move between search, roadmap, demo, and product pages without losing the search flow.',
      statusLive: 'Live search',
      nameLabel: 'Name',
      emailLabel: 'Email',
      phoneLabel: 'Phone',
      dateTimeLabel: 'Preferred time',
      notesLabel: 'Booking notes',
      notesPlaceholder: 'Add any useful context, timing, or service detail.',
      summaryTitle: 'Summary',
      noMatchTitle: "Let's refine your request",
      noMatchBody: 'Tell us a suburb, preferred time, or service detail and we will find the best fit.',
      geoHint: 'For tighter local matching, include the suburb or area you prefer.',
      thankYouTitle: 'Thank you',
      thankYouBody: 'Your booking is in motion. Next-step access is ready below.',
      requestedSlotLabel: 'Requested slot',
      followUpLabel: 'Follow-up',
      paymentActionLabel: 'Continue to payment',
      emailBookingLabel: 'Email booking details',
      calendarActionLabel: 'Add to calendar',
      viewCalendarLabel: 'View calendar event',
      qrLabel: 'Booking QR',
      returnHomeLabel: 'Return to homepage',
    },
  };
}
