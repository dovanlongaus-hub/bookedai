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
  { label: 'SME setup', query: 'Set up a booking-ready landing page, email, CRM, and calendar flow for my business.' },
  { label: 'AI Mentor 1-1', query: 'Book an AI Mentor 1-1 session for startup growth this week.' },
  { label: 'Haircut', query: 'Find a men\'s haircut near Sydney CBD this afternoon.' },
  { label: 'Restaurant', query: 'Find a restaurant near me tonight with live booking or call details.' },
];

const hotVietnameseSuggestions: HomepageSuggestion[] = [
  { label: 'Future Swim', query: 'Tìm lớp bơi Future Swim cho trẻ em gần Caringbah vào cuối tuần này.' },
  { label: 'Co Mai Hung Chess', query: 'Đặt lớp Co Mai Hung Chess Sydney pilot trong tuần này.' },
  { label: 'Thiết lập SME', query: 'Thiết lập landing page đặt lịch, email, CRM và lịch hẹn cho doanh nghiệp của tôi.' },
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
          eyebrow: 'Quy trình doanh thu',
          title: 'Trang chủ BookedAI là điểm tiếp xúc chính cho dòng doanh thu',
          body: 'BookedAI.au cho thấy cách hội thoại, sàng lọc nhu cầu, đặt chỗ và doanh thu được kết nối trong cùng một hệ thống.',
          points: [
            'Khu vực hero hiển thị đoạn hội thoại minh hoạ thay vì chỉ một ô tìm kiếm.',
            'Các thẻ năng lực, kết nối và nút hành động đều bám theo cùng một thông điệp doanh thu.',
            'Pitch Deck vẫn được dùng để kể câu chuyện sâu hơn, nhưng trang chủ đã là điểm tiếp xúc hoàn chỉnh.',
          ],
        },
        {
          id: 'revenue',
          eyebrow: 'Cỗ máy doanh thu',
          title: 'BookedAI.au là cỗ máy doanh thu cho SME ngành dịch vụ',
          body: brandPositioning,
          points: [
            'Nhu cầu khách đi vào từ một ô truy vấn duy nhất.',
            'Kết quả được xếp hạng và đưa thẳng sang hành động đặt chỗ.',
            'Thanh toán, xác nhận và bước tiếp theo được nối liên tục để không bỏ lỡ khách quan tâm.',
          ],
        },
        {
          id: 'channels',
          eyebrow: 'Kênh hội thoại',
          title: 'BookedAI thu và xử lý nhiều loại hội thoại trong cùng một luồng',
          body: 'Chat trên website, cuộc gọi nhỡ, email và các lượt theo dõi đều được gom về cùng một hệ thống để giảm thất thoát khách quan tâm.',
          points: [
            'Một luồng xử lý nhất quán cho chat, cuộc gọi, email và yêu cầu đặt chỗ.',
            'Sàng lọc nhu cầu và bước tiếp theo được hiển thị rõ thay vì trả lời chung chung.',
            'Kết quả cuối cùng luôn gắn với đặt chỗ, gọi lại, báo giá hoặc thu hồi doanh thu.',
          ],
        },
      ],
      pitchDeckSections: [
        {
          id: 'story',
          eyebrow: 'Câu chuyện BookedAI',
          title: 'Từ những yêu cầu rời rạc thành đặt chỗ tạo doanh thu',
          body: 'BookedAI được xây để biến nhu cầu rời rạc của các SME dịch vụ địa phương thành lộ trình đặt chỗ rõ ràng, thay vì để đội ngũ xử lý thủ công từng yêu cầu.',
          points: [
            'Điểm tiếp xúc lấy tìm kiếm làm trọng tâm.',
            'Gợi ý phù hợp do AI dẫn dắt và lộ trình đặt chỗ liền mạch.',
            'Thanh toán, xác nhận và đội ngũ chăm sóc cùng nằm trong một luồng.',
          ],
        },
        {
          id: 'engine',
          eyebrow: 'Cỗ máy doanh thu',
          title: 'BookedAI không phải chatbot, cũng không chỉ là widget đặt chỗ',
          body: 'Đây là bề mặt doanh thu: nắm bắt nhu cầu, hiểu ý định, xếp hạng gợi ý phù hợp nhất, rồi đưa khách đi trọn vẹn đến lúc đặt chỗ thành công.',
          points: [
            'Giảm rào cản ở màn hình đầu tiên.',
            'Tăng tỷ lệ chuyển đổi từ tìm kiếm sang đặt chỗ.',
            'Tạo góc nhìn rõ hơn cho đội ngũ về nhu cầu thật của khách.',
          ],
        },
        {
          id: 'fit',
          eyebrow: 'Phù hợp với SME dịch vụ',
          title: 'Phù hợp cho salon, phòng khám, gia sư, dịch vụ kỹ thuật và dịch vụ địa phương',
          body: 'Bất kỳ doanh nghiệp nào cần biến yêu cầu bằng ngôn ngữ tự nhiên thành hành động rõ ràng đều phù hợp với mô hình này.',
          points: [
            'Salon và phòng khám cần sàng lọc nhu cầu nhanh.',
            'Dịch vụ kỹ thuật cần phân loại mức độ khẩn cấp và điều phối.',
            'Gia sư và lớp học địa phương cần khớp đúng dịch vụ trước khi thanh toán.',
          ],
        },
      ],
      ui: {
        languageLabel: 'Ngôn ngữ',
        openMenu: 'Mở Menu',
        closeMenu: 'Đóng Menu',
        searchPlaceholder: 'Bạn muốn đặt dịch vụ nào hôm nay?',
        searchButton: 'Tìm và đặt ngay',
        revenueTagline: 'Cỗ máy doanh thu AI cho doanh nghiệp dịch vụ',
        resultsTitle: 'Kết quả tìm kiếm BookedAI',
        resultsEmptyTitle: 'Một ô tìm kiếm. Một hành động rõ ràng.',
        resultsEmptyBody: 'Nhập dịch vụ bạn cần và BookedAI sẽ dựng danh sách gợi ý, lộ trình đặt chỗ và xác nhận ngay trên trang này.',
        resultsLoadingTitle: 'Đang tìm kết quả phù hợp nhất',
        resultsLoadingBody: 'BookedAI đang tìm nơi phù hợp nhất, kiểm tra khu vực liên quan và mở tìm kiếm trực tiếp khi cần.',
        resultsQueryLabel: 'Truy vấn hiện tại',
        shortlistLabel: 'Danh sách gợi ý',
        shortlistBody: 'Kết quả được hiển thị như một bề mặt tìm kiếm độc lập, không phải cửa sổ trợ lý.',
        bookingPanelTitle: 'Đặt chỗ',
        bookingPanelEmpty: 'Chọn một kết quả để tiếp tục đặt chỗ.',
        bookingPanelSelected: 'Đã chọn',
        bookingPanelHelper: 'Luồng đặt chỗ này dùng đúng logic sản phẩm thật, đồng thời giữ trải nghiệm trên trang chủ nhanh và rõ ràng.',
        bookingButton: 'Tiếp tục đặt chỗ',
        bookingSubmitting: 'Đang tạo đặt chỗ...',
        bookingSuccessTitle: 'Đặt chỗ đã sẵn sàng',
        bookingSuccessBody: 'Thanh toán, xác nhận và bước theo dõi đã được chuẩn bị.',
        contactTeam: 'Liên hệ đội ngũ',
        watchDemo: 'Xem demo',
        pitchDeck: 'pitch.bookedai.au',
        roadmap: 'Lộ trình',
        menuTitle: 'Điều hướng',
        menuBody: 'Dùng menu này để di chuyển giữa tìm kiếm trực tiếp, lộ trình, demo và câu chuyện chính của BookedAI.au.',
        statusLive: 'Tìm kiếm trực tiếp',
        nameLabel: 'Tên',
        emailLabel: 'Email',
        phoneLabel: 'Số điện thoại',
        dateTimeLabel: 'Thời gian mong muốn',
        notesLabel: 'Ghi chú đặt chỗ',
        notesPlaceholder: 'Bổ sung yêu cầu, khung giờ hoặc bối cảnh để đội ngũ chuẩn bị tốt hơn.',
        summaryTitle: 'Tóm tắt',
        noMatchTitle: 'Chưa có gợi ý đủ phù hợp',
        noMatchBody: 'BookedAI sẽ ưu tiên độ chính xác hơn là đưa ra gợi ý sai lĩnh vực.',
        geoHint: 'Nếu cần độ chính xác địa phương cao hơn, hãy thêm khu vực hoặc địa điểm mong muốn.',
        thankYouTitle: 'Cảm ơn bạn',
        thankYouBody: 'Đặt chỗ đã được ghi nhận. Mã tham chiếu, portal, thanh toán, lịch và tin nhắn theo dõi đã sẵn sàng.',
        requestedSlotLabel: 'Khung giờ đã chọn',
        followUpLabel: 'Theo dõi',
        paymentActionLabel: 'Tiếp tục thanh toán',
        emailBookingLabel: 'Gửi email đặt chỗ',
        calendarActionLabel: 'Thêm vào lịch',
        viewCalendarLabel: 'Xem sự kiện lịch',
        qrLabel: 'Mã QR đặt chỗ',
        returnHomeLabel: 'Về lại trang chủ',
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
        eyebrow: 'Revenue Workflow',
        title: 'The homepage is now the primary landing surface for the revenue flow',
        body: 'The homepage now carries the product story, customer proof, and commercial CTA in one place.',
        points: [
          'The hero shows a conversational preview instead of only a search shell.',
          'Capability, integration, and outcome sections all point back to revenue.',
          'Pitch Deck still exists for deeper narrative, but the homepage is now a complete entry surface.',
        ],
      },
      {
        id: 'revenue',
        eyebrow: 'Revenue Engine',
        title: 'BookedAI.au is a revenue engine for service SMEs',
        body: brandPositioning,
        points: [
          'Search intent enters through a single query box.',
          'Results are ranked and pushed directly toward booking action.',
          'Payment, confirmation, and the next step stay connected so warm leads are not lost.',
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
          'Payment, confirmation, and team follow-through in one continuous flow.',
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
          'Clearer demand visibility for the business team.',
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
      thankYouBody: 'Your booking is captured. Reference, portal, payment, calendar, and follow-up are ready below.',
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
