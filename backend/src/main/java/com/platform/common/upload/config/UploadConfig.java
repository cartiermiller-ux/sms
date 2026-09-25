package com.platform.common.upload.config;

import com.platform.common.constant.AppConstants;
import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.annotation.PostConstruct;

/**
 * 文件上传
 */
@Component
@Data
public class UploadConfig {

    /**
     * 服务端域名
     */
    @Value("${upload.serverUrl}")
    private String serverUrl;
    /**
     * accessKey
     */
    @Value("${upload.accessKey}")
    private String accessKey;
    /**
     * secretKey
     */
    @Value("${upload.secretKey}")
    private String secretKey;
    /**
     * bucket
     */
    @Value("${upload.bucket}")
    private String bucket;
    /**
     * region
     */
    @Value("${upload.region}")
    private String region;
    /**
     * 封面
     */
    @Value("${upload.post}")
    private String post;

    /**
     * 依据 upload.serverUrl 推导默认头像地址，避免依赖已失效的第三方外链
     */
    @PostConstruct
    public void initDefaultPortrait() {
        if (!StringUtils.hasText(serverUrl)) {
            return;
        }
        String base = serverUrl.endsWith("/") ? serverUrl : serverUrl + "/";
        AppConstants.DEFAULT_PORTRAIT = base + "default-portrait.jpg";
    }

}
