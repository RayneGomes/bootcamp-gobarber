import User from '../models/User';
import Notifications from '../schemas/Notification';

class NotificationController {
  async index(req, res) {
    const checkUserProvider = await User.findOne({
      where: {
        id: req.userId,
        provider: true,
      },
    });

    if (!checkUserProvider) {
      return res.status(400).json({ error: 'User is not a provider' });
    }

    const notifications = await Notifications.find({
      user: req.userId,
    })
      .sort({ createdAt: 'desc' })
      .limit(20);

    return res.json({ notifications });
  }
}

export default new NotificationController();
